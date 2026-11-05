import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { isInviteRole, normalizeRole } from "@/lib/roles";
import {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  getProjectMemberRole,
} from "@/lib/project-members";
import { createInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

async function verifyProjectAccess(
  projectId: number,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  if (!user) return null;
  const { andWhere, params } = getAccessScope(user);
  const project = await db.get<{ id: number; name: string; company: string; workspaceId: number | null }>(
    `SELECT "id", "name", "company", "workspaceId" FROM "Project" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere} LIMIT 1`,
    [projectId, ...params],
  );
  return project || null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = await verifyProjectAccess(projectId, user);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const members = await listProjectMembers(projectId);
    const pendingInvites = await db.query<{
      token: string;
      role: string;
      createdBy: string;
      expiresAt: string;
      createdAt: string;
    }>(
      `SELECT "token", "role", "createdBy", "expiresAt", "createdAt"
       FROM "Invite"
       WHERE "projectId" = CAST(? AS INTEGER) AND "status" = 'pending' AND "expiresAt" > CURRENT_TIMESTAMP
       ORDER BY "createdAt" DESC`,
      [projectId],
    );

    const currentUserRole = await getProjectMemberRole(projectId, user.id, user.role);

    return NextResponse.json({
      data: {
        projectId,
        projectName: project.name,
        members,
        pendingInvites,
        currentUserRole,
        canManageMembers: ["admin", "superadmin", "pm"].includes(currentUserRole),
      },
    });
  } catch (err) {
    console.error("Failed to list project members:", err);
    return NextResponse.json({ error: "Failed to list project members" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = await verifyProjectAccess(projectId, user);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const userRole = await getProjectMemberRole(projectId, user.id, user.role);
  if (!["admin", "superadmin", "pm"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions to manage project members." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: number;
    email?: string;
    role?: string;
    expiresInDays?: number;
  } | null;

  const targetRole = normalizeRole(body?.role) || "qa";

  // Case 1: Add existing workspace user by userId
  if (body?.userId) {
    const targetUserId = Number(body.userId);
    const targetUser = await db.get<{ id: number; name: string; email: string }>(
      'SELECT "id", "name", "email" FROM "User" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL',
      [targetUserId],
    );
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await addProjectMember(projectId, targetUserId, targetRole, project.workspaceId);
    return NextResponse.json({
      ok: true,
      message: `User ${targetUser.name || targetUser.email} added to project with role ${targetRole}.`,
    });
  }

  // Case 2: Invite user via email / generate invite link
  if (!isInviteRole(targetRole)) {
    return NextResponse.json({ error: "Role is not allowed for invite." }, { status: 400 });
  }

  const result = await createInvite({
    company: project.company,
    workspaceId: project.workspaceId || undefined,
    projectId,
    role: targetRole,
    expiresInDays: body?.expiresInDays || 7,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const link = `${origin}/login?mode=signup&inviteToken=${result.token}`;

  return NextResponse.json({
    ok: true,
    invite: result,
    link,
    message: `Invite generated for project ${project.name} with role ${targetRole}.`,
  }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = await verifyProjectAccess(projectId, user);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const userRole = await getProjectMemberRole(projectId, user.id, user.role);
  if (!["admin", "superadmin", "pm"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: number;
    role?: string;
  } | null;

  const targetUserId = Number(body?.userId || 0);
  const nextRole = normalizeRole(body?.role);
  if (!targetUserId || !nextRole) {
    return NextResponse.json({ error: "User ID and valid role are required." }, { status: 400 });
  }

  await updateProjectMemberRole(projectId, targetUserId, nextRole);
  return NextResponse.json({ ok: true, role: nextRole });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = await verifyProjectAccess(projectId, user);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const userRole = await getProjectMemberRole(projectId, user.id, user.role);
  if (!["admin", "superadmin", "pm"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions." }, { status: 403 });
  }

  const targetUserId = Number(request.nextUrl.searchParams.get("userId") || 0);
  if (!targetUserId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  await removeProjectMember(projectId, targetUserId);
  return NextResponse.json({ ok: true, message: "Member removed from project." });
}
