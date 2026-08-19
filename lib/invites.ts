import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin, isInviteRole, isManagementAdmin, normalizeRole } from "@/lib/roles";
import { syncAssigneeFromUser } from "@/lib/user-assignee-sync";
import { checkCompanyUserLimit } from "@/lib/plan-limits";
import { ensureWorkspace, ensureWorkspaceMembership } from "@/lib/workspace-memberships";

type InviteRow = {
  id: number;
  token: string;
  company: string;
  workspaceId?: number | null;
  role: string;
  status: string;
  createdBy: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type InviteInput = {
  company?: string;
  workspaceId?: number;
  role: string;
  expiresInDays?: number;
};

function makeToken() {
  return randomBytes(18).toString("base64url");
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function getInviteByToken(token: string) {
  return db.get<InviteRow>('SELECT * FROM "Invite" WHERE "token" = ?', [token]);
}

export async function listInvites() {
  return db.query<InviteRow>('SELECT * FROM "Invite" WHERE "status" = ? ORDER BY "createdAt" DESC', ["pending"]);
}

export async function createInvite(input: InviteInput) {
  const user = await getCurrentUser();
  const role = normalizeRole(input.role) || "qa";
  const expiresInDays = Number.isFinite(input.expiresInDays ?? NaN) ? Number(input.expiresInDays) : 7;
  if (!user || !isManagementAdmin(user.role, user.company)) {
    return { error: "Unauthorized" } as const;
  }
  if (!isInviteRole(role)) {
    return { error: "Role is not allowed." } as const;
  }

  const memberships = await import("@/lib/workspace-memberships").then(({ getWorkspaceMembershipsForUser }) => getWorkspaceMembershipsForUser(user.id));
  const selectedWorkspaceId = Number(input.workspaceId || 0);
  const selectedMembership = selectedWorkspaceId ? memberships.find((item) => Number(item.workspaceId) === selectedWorkspaceId) : null;
  const inviteCompany = String(input.company ?? selectedMembership?.name ?? user.company ?? "").trim();
  if (!inviteCompany) {
    return { error: "Workspace is required." } as const;
  }

  if (selectedMembership && !["admin", "superadmin"].includes(normalizeRole(selectedMembership.role))) {
    return { error: "Unauthorized" } as const;
  }

  // Check user limit for the workspace
  if (inviteCompany) {
    const limitCheck = await checkCompanyUserLimit(inviteCompany);
    if (!limitCheck.allowed) {
      return { error: "USER_LIMIT_REACHED", current: limitCheck.current, max: limitCheck.max, plan: limitCheck.plan } as const;
    }
  }

  const token = makeToken();
  const expiresAt = addDays(Math.max(1, Math.min(expiresInDays, 30)));
  const workspace = await ensureWorkspace(inviteCompany, user.id || null);
  await db.run(
    'INSERT INTO "Invite" ("token", "company", "workspaceId", "role", "status", "createdBy", "expiresAt") VALUES (?, ?, CAST(? AS INTEGER), ?, ?, ?, ?)',
    [token, inviteCompany, (workspace?.id ?? selectedWorkspaceId) || null, role, "pending", user.email || "", expiresAt],
  );

  return {
    token,
    company: inviteCompany,
    role,
    expiresAt,
  } as const;
}

export async function revokeInvite(token: string) {
  const user = await getCurrentUser();
  if (!user || !isPlatformSuperAdmin(user.role, user.company)) {
    return { error: "Unauthorized" } as const;
  }
  await db.run('UPDATE "Invite" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "token" = ?', ["revoked", token]);
  return { ok: true } as const;
}

export async function markInviteAccepted(token: string, email: string) {
  const invite = await getInviteByToken(token);
  if (!invite) return { error: "Invite not found." } as const;
  if (invite.status === "accepted") {
    return { ok: true, company: invite.company, role: invite.role } as const;
  }
  if (invite.status !== "pending") return { error: "Invite is not active." } as const;
  if (new Date(String(invite.expiresAt)).getTime() < Date.now()) {
    await db.run('UPDATE "Invite" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "token" = ?', ["expired", token]);
    return { error: "Invite expired." } as const;
  }
  if (String(email ?? "").trim() === "") return { error: "Email is required." } as const;
  if (!isInviteRole(normalizeRole(invite.role))) {
    return { error: "Invite role is not allowed." } as const;
  }

  await db.run(
    'UPDATE "Invite" SET "status" = ?, "acceptedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "token" = ?',
    ["accepted", token],
  );
  return { ok: true, company: invite.company, role: invite.role } as const;
}

export async function acceptInvite(token: string, email: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" } as const;
  const invite = await getInviteByToken(token);
  if (!invite) return { error: "Invite not found." } as const;
  const existingUser = await db.get<{ id: number; email: string }>('SELECT id, email FROM "User" WHERE "email" = ?', [email]);
  if (!existingUser) {
    return { error: "User not found." } as const;
  }

  const workspace = invite.workspaceId
    ? { id: invite.workspaceId }
    : await ensureWorkspace(invite.company, existingUser.id);

  await db.run(
    'UPDATE "User" SET "company" = ?, "role" = ?, "workspaceId" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP WHERE "email" = ?',
    [invite.company, invite.role, workspace?.id ?? null, email],
  );
  const updatedUser = await db.get<{ id: number; company: string; name: string | null; email: string | null; role: string | null }>(
    'SELECT "id", "company", "name", "email", "role" FROM "User" WHERE "email" = ?',
    [email],
  );
  if (updatedUser) {
    if (workspace?.id) {
      await ensureWorkspaceMembership(workspace.id, updatedUser.id, invite.role);
    }
    await syncAssigneeFromUser(updatedUser);
  }
  return markInviteAccepted(token, email);
}
