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

  const existing = await db.get<{ id: number; name: string; slug: string; uuid?: string }>(
    'SELECT "id", "name", "slug", "uuid" FROM "Workspace" WHERE "name" = ?',
    [trimmed],
  );
  if (existing) return existing;

  const { randomUUID } = await import("crypto");
  const wsUuid = randomUUID();
  const slug = await uniqueWorkspaceSlug(trimmed);
  await db.run(
    'INSERT INTO "Workspace" ("name", "slug", "uuid", "createdByUserId") VALUES (?, ?, ?, CAST(? AS INTEGER))',
    [trimmed, slug, wsUuid, createdByUserId ?? null],
  );

  return db.get<{ id: number; name: string; slug: string; uuid?: string }>(
    'SELECT "id", "name", "slug", "uuid" FROM "Workspace" WHERE "name" = ?',
    [trimmed],
  );
}

export function isOwnerUser(email: string | null | undefined): boolean {
  const norm = String(email ?? "").trim().toLowerCase();
  if (!norm) return false;
  return (
    norm === "wahyu.priyono@magnusdigital.co.id" ||
    norm === "wahyu@akusara.dev" ||
    norm.startsWith("wahyu.priyono@")
  );
}

export async function ensurePersonalWorkspaceForUser(
  userId: number,
  userName?: string | null,
  userEmail?: string | null,
  preferredName?: string | null,
): Promise<{ id: number; name: string; slug: string; uuid?: string } | null> {
  const { randomUUID } = await import("crypto");

  // 1. If this is primary owner Wahyu, preserve existing workspaces (VanApp / Akusara Project)
  if (isOwnerUser(userEmail) || userId === 9) {
    const wahyuWs = await db.get<{ id: number; name: string; slug: string; uuid?: string }>(
      `SELECT w."id", w."name", w."slug", w."uuid"
       FROM "Workspace" w
       INNER JOIN "WorkspaceMembership" wm ON wm."workspaceId" = w."id"
       WHERE wm."userId" = CAST(? AS INTEGER)
       ORDER BY (CASE WHEN w."id" = 15 THEN 0 WHEN w."id" = 1 THEN 1 ELSE 2 END) ASC
       LIMIT 1`,
      [userId],
    );
    if (wahyuWs) {
      await db.run(
        'UPDATE "User" SET "workspaceId" = CAST(? AS INTEGER), "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
        [wahyuWs.id, wahyuWs.id, wahyuWs.name, userId],
      );
      return wahyuWs;
    }
  }

  // 2. Check if this user already created/owns a dedicated workspace
  const ownedWs = await db.get<{ id: number; name: string; slug: string; uuid?: string }>(
    `SELECT w."id", w."name", w."slug", w."uuid"
     FROM "Workspace" w
     WHERE w."createdByUserId" = CAST(? AS INTEGER)
     ORDER BY w."id" ASC
     LIMIT 1`,
    [userId],
  );

  if (ownedWs) {
    await ensureWorkspaceMembership(ownedWs.id, userId, "admin");
    // Remove from default workspace 1 if accidentally joined
    try {
      await db.run(
        'DELETE FROM "WorkspaceMembership" WHERE "workspaceId" = 1 AND "userId" = CAST(? AS INTEGER)',
        [userId],
      );
    } catch { /* ignore non-critical */ }
    await db.run(
      'UPDATE "User" SET "workspaceId" = CAST(? AS INTEGER), "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
      [ownedWs.id, ownedWs.id, ownedWs.name, userId],
    );
    return ownedWs;
  }

  // 3. User does not have their own workspace yet -> create a dedicated one with UUID
  const wsUuid = randomUUID();
  const rawBaseName = String(preferredName || "").trim();
  const fallbackName = `${String(userName || "").trim() || String(userEmail || "").split("@")[0] || "User"}'s Workspace`;
  const baseName = (rawBaseName && rawBaseName !== "Akusara Project") ? rawBaseName : fallbackName;

  // Ensure workspace name is unique
  let finalName = baseName;
  const nameExists = await db.get<{ id: number }>('SELECT "id" FROM "Workspace" WHERE "name" = ?', [finalName]);
  if (nameExists) {
    finalName = `${baseName} (${wsUuid.slice(0, 6)})`;
  }

  const baseSlug = toWorkspaceSlug(baseName);
  const slug = `${baseSlug}-${wsUuid.slice(0, 8)}`;

  await db.run(
    'INSERT INTO "Workspace" ("name", "slug", "uuid", "createdByUserId") VALUES (?, ?, ?, CAST(? AS INTEGER))',
    [finalName, slug, wsUuid, userId],
  );

  const createdWs = await db.get<{ id: number; name: string; slug: string; uuid?: string }>(
    'SELECT "id", "name", "slug", "uuid" FROM "Workspace" WHERE "uuid" = ?',
    [wsUuid],
  );

  if (!createdWs) return null;

  // Ensure Company record
  try {
    await db.run(
      'INSERT INTO "Company" ("name", "plan", "maxUsers", "status") VALUES (?, ?, ?, ?) ON CONFLICT ("name") DO NOTHING',
      [finalName, "free", 5, "active"],
    );
  } catch { /* non-critical */ }

  // Assign admin membership
  await ensureWorkspaceMembership(createdWs.id, userId, "admin");

  // Remove accidental membership in Workspace 1
  try {
    await db.run(
      'DELETE FROM "WorkspaceMembership" WHERE "workspaceId" = 1 AND "userId" = CAST(? AS INTEGER)',
      [userId],
    );
  } catch { /* ignore non-critical */ }

  // Update user's active workspace and company
  await db.run(
    'UPDATE "User" SET "workspaceId" = CAST(? AS INTEGER), "activeWorkspaceId" = CAST(? AS INTEGER), "company" = ? WHERE "id" = CAST(? AS INTEGER)',
    [createdWs.id, createdWs.id, finalName, userId],
  );

  return createdWs;
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
  const trimmed = String(company || "").trim();
  if (!trimmed || trimmed === "Akusara Project") {
    const user = await db.get<{ name: string | null; email: string | null }>('SELECT "name", "email" FROM "User" WHERE "id" = CAST(? AS INTEGER)', [userId]);
    return ensurePersonalWorkspaceForUser(userId, user?.name, user?.email);
  }
  const workspace = await ensureWorkspace(trimmed, userId);
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
    uuid?: string;
    accentColor: string;
    templateKey: string;
    iconPath: string;
    timezone: string;
    sprintFormat: string;
    createdByUserId: number | null;
  }>(
    `SELECT wm."id", wm."workspaceId", wm."role", wm."status", w."name", w."slug", w."uuid", w."accentColor", w."templateKey", w."iconPath", COALESCE(w."timezone", 'Asia/Jakarta') as "timezone", COALESCE(w."sprintFormat", 'Sprint {N}') as "sprintFormat", w."createdByUserId"
     FROM "WorkspaceMembership" wm
     INNER JOIN "Workspace" w ON w."id" = wm."workspaceId"
     WHERE wm."userId" = CAST(? AS INTEGER)
     ORDER BY w."name" ASC`,
    [userId],
  );
}

export async function updateWorkspaceSettings(workspaceId: number, data: { name: string; accentColor?: string; templateKey?: string; iconPath?: string; timezone?: string; sprintFormat?: string }) {
  const trimmedName = String(data.name || "").trim();
  if (!trimmedName) throw new Error("Workspace name is required.");
  await db.run(
    'UPDATE "Workspace" SET "name" = ?, "accentColor" = ?, "templateKey" = ?, "iconPath" = ?, "timezone" = ?, "sprintFormat" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
    [
      trimmedName,
      data.accentColor || '#2563eb',
      data.templateKey || 'custom',
      data.iconPath || '',
      data.timezone || 'Asia/Jakarta',
      data.sprintFormat || 'Sprint {N}',
      workspaceId
    ],
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
