import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/roles";

function toWorkspaceSlug(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";
}

async function uniqueWorkspaceSlug(baseName: string) {
  const base = toWorkspaceSlug(baseName);
  let slug = base;
  let counter = 2;
  while (await db.get<{ id: number }>('SELECT "id" FROM "Workspace" WHERE "slug" = ?', [slug])) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export async function ensureWorkspace(name: string, createdByUserId?: number | null) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;

  const existing = await db.get<{ id: number; name: string; slug: string }>(
    'SELECT "id", "name", "slug" FROM "Workspace" WHERE "name" = ?',
    [trimmed],
  );
  if (existing) return existing;

  const slug = await uniqueWorkspaceSlug(trimmed);
  await db.run(
    'INSERT INTO "Workspace" ("name", "slug", "createdByUserId") VALUES (?, ?, CAST(? AS INTEGER))',
    [trimmed, slug, createdByUserId ?? null],
  );

  return db.get<{ id: number; name: string; slug: string }>(
    'SELECT "id", "name", "slug" FROM "Workspace" WHERE "name" = ?',
    [trimmed],
  );
}

export async function ensureWorkspaceMembership(workspaceId: number, userId: number, role: string) {
  const normalizedRole = normalizeRole(role) || "qa";
  const existing = await db.get<{ id: number }>(
    'SELECT "id" FROM "WorkspaceMembership" WHERE "workspaceId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [workspaceId, userId],
  );

  if (existing) {
    await db.run(
      'UPDATE "WorkspaceMembership" SET "role" = ?, "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [normalizedRole, "active", existing.id],
    );
    return existing.id;
  }

  await db.run(
    'INSERT INTO "WorkspaceMembership" ("workspaceId", "userId", "role", "status") VALUES (CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?)',
    [workspaceId, userId, normalizedRole, "active"],
  );

  const row = await db.get<{ id: number }>(
    'SELECT "id" FROM "WorkspaceMembership" WHERE "workspaceId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [workspaceId, userId],
  );
  return row?.id ?? null;
}

export async function ensureWorkspaceForUser(company: string, userId: number, role: string) {
  const workspace = await ensureWorkspace(company, userId);
  if (!workspace) return null;
  await ensureWorkspaceMembership(workspace.id, userId, role);
  return workspace;
}

export async function getWorkspaceMembershipsForUser(userId: number) {
  return db.query<{
    id: number;
    workspaceId: number;
    role: string;
    status: string;
    name: string;
    slug: string;
    accentColor: string;
    templateKey: string;
    iconPath: string;
    createdByUserId: number | null;
  }>(
    `SELECT wm."id", wm."workspaceId", wm."role", wm."status", w."name", w."slug", w."accentColor", w."templateKey", w."iconPath", w."createdByUserId"
     FROM "WorkspaceMembership" wm
     INNER JOIN "Workspace" w ON w."id" = wm."workspaceId"
     WHERE wm."userId" = CAST(? AS INTEGER)
     ORDER BY w."name" ASC`,
    [userId],
  );
}

export async function updateWorkspaceSettings(workspaceId: number, data: { name: string; accentColor: string; templateKey: string; iconPath?: string }) {
  const trimmedName = String(data.name || "").trim();
  if (!trimmedName) throw new Error("Workspace name is required.");
  await db.run(
    'UPDATE "Workspace" SET "name" = ?, "accentColor" = ?, "templateKey" = ?, "iconPath" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
    [trimmedName, data.accentColor || '#2563eb', data.templateKey || 'custom', data.iconPath || '', workspaceId],
  );
}

export async function transferWorkspaceOwnership(workspaceId: number, fromUserId: number, toUserId: number) {
  await db.transaction(async () => {
    await db.run(
      'UPDATE "Workspace" SET "createdByUserId" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [toUserId, workspaceId],
    );
    await ensureWorkspaceMembership(workspaceId, toUserId, 'admin');
    await db.run(
      'UPDATE "WorkspaceMembership" SET "role" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "workspaceId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
      ['qa', workspaceId, fromUserId],
    );
  });
}
