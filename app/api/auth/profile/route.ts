import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createSessionToken, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncAssigneeFromUser, propagateNameChange } from "@/lib/user-assignee-sync";
import { INVITE_ROLES, normalizeRole } from "@/lib/roles";

// Only non-privileged workspace roles can be self-assigned. Admin/superadmin
// must be granted by an existing admin (via /api/users/[id] or invites) —
// a normal user must never be able to promote themselves.
const SELF_ASSIGNABLE_ROLES = new Set<string>(INVITE_ROLES);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Static administrator cannot be modified via DB
    if (user.id === 0) {
      return NextResponse.json({ error: "Administrator profile is controlled via environment variables and cannot be modified." }, { status: 403 });
    }

    const body = await request.json();
    const { name, role, password } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const oldName = (user.name || user.email || "").trim();
    const newName = name.trim();

    // Role whitelist: a user can only keep their current role, or set a
    // non-privileged role. Admin/superadmin can never be self-assigned here.
    const normalizedRequested = normalizeRole(role);
    const currentRole = normalizeRole(user.role);
    const canRequestAdmin =
      normalizedRequested === "admin" && (currentRole === "admin" || currentRole === "superadmin");
    const nextRole =
      canRequestAdmin ||
      normalizedRequested === "superadmin" && currentRole === "superadmin"
        ? normalizedRequested
        : SELF_ASSIGNABLE_ROLES.has(normalizedRequested)
          ? normalizedRequested
          : currentRole || "qa";

    if (password && password.length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      const { hashPassword } = await import("@/lib/auth-core");
      const hashedPassword = await hashPassword(password);

      await db.run(
        'UPDATE "User" SET "name" = ?, "role" = ?, "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
        [newName, nextRole, hashedPassword, user.id]
      );
      await syncAssigneeFromUser({
        id: user.id,
        company: user.company,
        name: newName,
        email: user.email,
        role: nextRole,
      });
    } else {
      await db.run(
        'UPDATE "User" SET "name" = ?, "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
        [newName, nextRole, user.id]
      );
      await syncAssigneeFromUser({
        id: user.id,
        company: user.company,
        name: newName,
        email: user.email,
        role: nextRole,
      });
    }

    // Propagate name change to all existing records (tasks, test cases, bugs, etc.)
    if (oldName !== newName) {
      await propagateNameChange(user.company, oldName, newName);
    }

    const updatedUser = {
      id: user.id,
      name: newName,
      role: nextRole,
      company: user.company,
    };
    const response = NextResponse.json({ success: true, user: updatedUser });
    response.cookies.set(sessionCookieName(), await createSessionToken(user.email, updatedUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    });
    return response;
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
