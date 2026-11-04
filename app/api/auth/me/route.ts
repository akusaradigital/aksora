import { NextResponse } from "next/server";
import { authEnabled, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      authEnabled: authEnabled(),
      authenticated: false,
      user: null,
    });
  }

  // Fetch avatar from DB (not stored in session token to keep it small)
  let avatar = "";
  try {
    const row = await db.get<{ avatar: string | null }>(
      'SELECT "avatar" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
      [user.id]
    );
    avatar = row?.avatar || "";
  } catch { /* avatar column may not exist yet */ }

  const memberships = user.id ? await getWorkspaceMembershipsForUser(user.id) : [];

  const response = NextResponse.json({
    authEnabled: authEnabled(),
    authenticated: true,
    user: { ...user, avatar, memberships },
  });

  // Self-healing: automatically refresh cookie with hydrated active workspace & company
  try {
    const { createSessionToken, sessionCookieName } = await import("@/lib/auth-core");
    const token = await createSessionToken(user.email, {
      id: user.id,
      name: user.name,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId,
      locale: user.locale,
    });
    const maxAge = Number(process.env.SESSION_TTL_HOURS || 6) * 60 * 60;
    response.cookies.set(sessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
  } catch {
    /* non-blocking session refresh */
  }

  return response;
}
