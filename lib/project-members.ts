import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/roles";

export type ProjectMemberRow = {
  id: number;
  uuid: string;
  projectId: number;
  userId: number;
  workspaceId: number | null;
  role: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
};

export async function listProjectMembers(projectId: number): Promise<ProjectMemberRow[]> {
  return db.query<ProjectMemberRow>(
    `SELECT pm."id", pm."uuid", pm."projectId", pm."userId", pm."workspaceId", pm."role",
            COALESCE(u."name", u."email") as "name", u."email", COALESCE(u."avatar", '') as "avatar",
            pm."createdAt", pm."updatedAt"
     FROM "ProjectMember" pm
     INNER JOIN "User" u ON u."id" = pm."userId"
     WHERE pm."projectId" = CAST(? AS INTEGER) AND u."deletedAt" IS NULL
     ORDER BY pm."createdAt" ASC`,
    [projectId],
  );
}

export async function addProjectMember(
  projectId: number,
  userId: number,
  role: string,
  workspaceId?: number | null,
): Promise<number | null> {
  const normalizedRole = normalizeRole(role) || "qa";
  const { randomUUID } = await import("crypto");
  const memberUuid = randomUUID();

  const existing = await db.get<{ id: number }>(
    'SELECT "id" FROM "ProjectMember" WHERE "projectId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [projectId, userId],
  );

  if (existing) {
    await db.run(
      'UPDATE "ProjectMember" SET "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [normalizedRole, existing.id],
    );
    return existing.id;
  }

  await db.run(
    'INSERT INTO "ProjectMember" ("uuid", "projectId", "userId", "workspaceId", "role") VALUES (?, CAST(? AS INTEGER), CAST(? AS INTEGER), CAST(? AS INTEGER), ?)',
    [memberUuid, projectId, userId, workspaceId ?? null, normalizedRole],
  );

  const row = await db.get<{ id: number }>(
    'SELECT "id" FROM "ProjectMember" WHERE "uuid" = ?',
    [memberUuid],
  );
  return row?.id ?? null;
}

export async function removeProjectMember(projectId: number, userId: number): Promise<boolean> {
  await db.run(
    'DELETE FROM "ProjectMember" WHERE "projectId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [projectId, userId],
  );
  return true;
}

export async function updateProjectMemberRole(projectId: number, userId: number, role: string): Promise<boolean> {
  const normalized = normalizeRole(role) || "qa";
  await db.run(
    'UPDATE "ProjectMember" SET "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "projectId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [normalized, projectId, userId],
  );
  return true;
}

export async function getProjectMemberRole(
  projectId: number,
  userId: number,
  userWorkspaceRole?: string,
): Promise<string> {
  const wsRole = normalizeRole(userWorkspaceRole);
  if (wsRole === "admin" || wsRole === "superadmin") return "admin";

  const member = await db.get<{ role: string }>(
    'SELECT "role" FROM "ProjectMember" WHERE "projectId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [projectId, userId],
  );
  return member?.role ? normalizeRole(member.role) : (wsRole || "guest");
}
