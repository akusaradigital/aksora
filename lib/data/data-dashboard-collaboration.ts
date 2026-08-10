import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";

// --- Dashboard Comments (Phase 4) ---

export interface DashboardCommentRow {
  id: number;
  company: string;
  entityType: string;
  entityId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get comments for a specific entity, scoped by company.
 * Returns comments ordered by createdAt ASC (oldest first), excluding soft-deleted.
 */
export async function getComments(
  company: string,
  entityType: string,
  entityId: number
): Promise<DashboardCommentRow[]> {
  const rows = await db.query<Record<string, unknown>>(
    `SELECT "id", "company", "entityType", "entityId", "authorId", "authorName", "content", "createdAt", "updatedAt"
     FROM "DashboardComment"
     WHERE "company" = ? AND "entityType" = ? AND "entityId" = ? AND "deletedAt" IS NULL
     ORDER BY "createdAt" ASC`,
    [company, entityType, entityId],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    company: String(row.company ?? ""),
    entityType: String(row.entityType ?? ""),
    entityId: Number(row.entityId ?? 0),
    authorId: Number(row.authorId ?? 0),
    authorName: String(row.authorName ?? ""),
    content: String(row.content ?? ""),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  }));
}

/**
 * Create a comment for a dashboard entity and log the activity.
 * Returns the created comment row.
 */
export async function createComment(
  company: string,
  entityType: string,
  entityId: number,
  authorId: number,
  authorName: string,
  content: string
): Promise<DashboardCommentRow | undefined> {
  await db.run(
    `INSERT INTO "DashboardComment" ("company", "entityType", "entityId", "authorId", "authorName", "content")
     VALUES (?, ?, ?, ?, ?, ?)`,
    [company, entityType, entityId, authorId, authorName, content],
  );

  // Retrieve the newly created comment
  const created = await db.get<Record<string, unknown>>(
    `SELECT "id", "company", "entityType", "entityId", "authorId", "authorName", "content", "createdAt", "updatedAt"
     FROM "DashboardComment"
     WHERE "company" = ? AND "entityType" = ? AND "entityId" = ? AND "authorId" = ?
     ORDER BY "id" DESC LIMIT 1`,
    [company, entityType, entityId, authorId],
  );

  // Log activity
  const summary = `${authorName} commented on ${entityType} #${entityId}`;
  await logActivity(company, entityType, String(entityId), "Commented", summary, authorName);

  if (!created) return undefined;

  return {
    id: Number(created.id),
    company: String(created.company ?? ""),
    entityType: String(created.entityType ?? ""),
    entityId: Number(created.entityId ?? 0),
    authorId: Number(created.authorId ?? 0),
    authorName: String(created.authorName ?? ""),
    content: String(created.content ?? ""),
    createdAt: String(created.createdAt ?? ""),
    updatedAt: String(created.updatedAt ?? ""),
  };
}


// ─── Presence Heartbeat Functions (Phase 4) ─────────────────────────────────

/**
 * Upsert a presence heartbeat for a user.
 * Uses INSERT ON CONFLICT to update lastSeen.
 */
export async function upsertHeartbeat(company: string, userId: number, userName: string): Promise<void> {
  await db.run(
    `INSERT INTO "PresenceHeartbeat" ("company", "userId", "userName", "lastSeen")
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId") DO UPDATE SET
       "company" = EXCLUDED."company",
       "userName" = EXCLUDED."userName",
       "lastSeen" = CURRENT_TIMESTAMP`,
    [company, userId, userName],
  );
}

/**
 * Get online members for a company (entries within 5 minutes).
 */
export async function getOnlineMembers(company: string): Promise<Array<{ userId: number; userName: string; lastSeen: string }>> {
  const rows = await db.query<{ userId: number | string; userName: string; lastSeen: string }>(
    `SELECT "userId", "userName", "lastSeen"
     FROM "PresenceHeartbeat"
     WHERE "company" = ? AND "lastSeen" >= (NOW() - INTERVAL '5 minutes')
     ORDER BY "lastSeen" DESC`,
    [company],
  );

  return rows.map((row) => ({
    userId: Number(row.userId),
    userName: String(row.userName ?? ""),
    lastSeen: String(row.lastSeen ?? ""),
  }));
}

/**
 * Remove stale presence entries (older than 5 minutes).
 */
export async function removeStalePresence(): Promise<void> {
  await db.run(
    `DELETE FROM "PresenceHeartbeat" WHERE "lastSeen" < (NOW() - INTERVAL '5 minutes')`,
  );
}


// ─── Dashboard Saved Filters (Phase 5) ──────────────────────────────────────

export interface DashboardFilterRow {
  id: number;
  company: string;
  userId: number;
  userName: string;
  name: string;
  project: string;
  activityScope: string;
  density: string;
  shared: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get filters for a user: own filters first, then shared filters from same company.
 * Excludes soft-deleted filters.
 */
export async function getFilters(
  company: string,
  userId: number
): Promise<{ own: DashboardFilterRow[]; shared: DashboardFilterRow[] }> {
  const ownRows = await db.query<Record<string, unknown>>(
    `SELECT "id", "company", "userId", "userName", "name", "project", "activityScope", "density", "shared", "createdAt", "updatedAt"
     FROM "DashboardFilter"
     WHERE "company" = ? AND "userId" = ? AND "deletedAt" IS NULL
     ORDER BY "createdAt" DESC`,
    [company, userId],
  );

  const sharedRows = await db.query<Record<string, unknown>>(
    `SELECT "id", "company", "userId", "userName", "name", "project", "activityScope", "density", "shared", "createdAt", "updatedAt"
     FROM "DashboardFilter"
     WHERE "company" = ? AND "userId" != ? AND "shared" = 1 AND "deletedAt" IS NULL
     ORDER BY "createdAt" DESC`,
    [company, userId],
  );

  const mapRow = (row: Record<string, unknown>): DashboardFilterRow => ({
    id: Number(row.id),
    company: String(row.company ?? ""),
    userId: Number(row.userId ?? 0),
    userName: String(row.userName ?? ""),
    name: String(row.name ?? ""),
    project: String(row.project ?? ""),
    activityScope: String(row.activityScope ?? "team"),
    density: String(row.density ?? "comfortable"),
    shared: Number(row.shared ?? 0),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  });

  return {
    own: ownRows.map(mapRow),
    shared: sharedRows.map(mapRow),
  };
}

/**
 * Check if a filter name is unique for a given user+company (among non-deleted filters).
 * Returns true if the name is available (unique), false if already taken.
 */
export async function checkFilterNameUnique(
  company: string,
  userId: number,
  name: string
): Promise<boolean> {
  const row = await db.get<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM "DashboardFilter"
     WHERE "company" = ? AND "userId" = ? AND "name" = ? AND "deletedAt" IS NULL`,
    [company, userId, name],
  );
  return Number(row?.count ?? 0) === 0;
}

/**
 * Create a saved filter for a user.
 * Enforces max 20 filters per user and unique name per user+company.
 * Calls logActivity on creation.
 * Returns the created filter or an error string.
 */
export async function createFilter(
  company: string,
  userId: number,
  userName: string,
  name: string,
  project: string,
  activityScope: string,
  density: string,
  shared: boolean
): Promise<{ filter?: DashboardFilterRow; error?: string }> {
  // Check max 20 filters per user
  const countRow = await db.get<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM "DashboardFilter"
     WHERE "company" = ? AND "userId" = ? AND "deletedAt" IS NULL`,
    [company, userId],
  );
  if (Number(countRow?.count ?? 0) >= 20) {
    return { error: "Maximum of 20 saved filters reached" };
  }

  // Check unique name
  const isUnique = await checkFilterNameUnique(company, userId, name);
  if (!isUnique) {
    return { error: "A filter with this name already exists" };
  }

  const sharedInt = shared ? 1 : 0;

  await db.run(
    `INSERT INTO "DashboardFilter" ("company", "userId", "userName", "name", "project", "activityScope", "density", "shared")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [company, userId, userName, name, project, activityScope, density, sharedInt],
  );

  // Retrieve the newly created filter
  const created = await db.get<Record<string, unknown>>(
    `SELECT "id", "company", "userId", "userName", "name", "project", "activityScope", "density", "shared", "createdAt", "updatedAt"
     FROM "DashboardFilter"
     WHERE "company" = ? AND "userId" = ? AND "name" = ? AND "deletedAt" IS NULL
     ORDER BY "id" DESC LIMIT 1`,
    [company, userId, name],
  );

  // Log activity
  await logActivity(company, "DashboardFilter", String(created?.id ?? ""), "Created", `${userName} created filter "${name}"`, userName);

  if (!created) return {};

  return {
    filter: {
      id: Number(created.id),
      company: String(created.company ?? ""),
      userId: Number(created.userId ?? 0),
      userName: String(created.userName ?? ""),
      name: String(created.name ?? ""),
      project: String(created.project ?? ""),
      activityScope: String(created.activityScope ?? "team"),
      density: String(created.density ?? "comfortable"),
      shared: Number(created.shared ?? 0),
      createdAt: String(created.createdAt ?? ""),
      updatedAt: String(created.updatedAt ?? ""),
    },
  };
}

/**
 * Update a saved filter.
 * Only the owner can update, and the updated name must remain unique.
 * Calls logActivity on update.
 */
export async function updateFilter(
  company: string,
  userId: number,
  filterId: number,
  name: string,
  project: string,
  activityScope: string,
  density: string,
  shared: boolean,
): Promise<{ filter?: DashboardFilterRow; error?: string }> {
  const filter = await db.get<Record<string, unknown>>(
    `SELECT "id", "userId", "name", "userName" FROM "DashboardFilter"
     WHERE "id" = ? AND "company" = ? AND "deletedAt" IS NULL`,
    [filterId, company],
  );

  if (!filter) {
    return { error: "Filter not found" };
  }

  if (Number(filter.userId) !== userId) {
    return { error: "Only the filter owner can update this filter" };
  }

  const conflict = await db.get<{ count: number | string }>(
    `SELECT COUNT(*) as count FROM "DashboardFilter"
     WHERE "company" = ? AND "userId" = ? AND "name" = ? AND "id" != ? AND "deletedAt" IS NULL`,
    [company, userId, name, filterId],
  );
  if (Number(conflict?.count ?? 0) > 0) {
    return { error: "A filter with this name already exists" };
  }

  await db.run(
    `UPDATE "DashboardFilter"
     SET "name" = ?, "project" = ?, "activityScope" = ?, "density" = ?, "shared" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "company" = ?`,
    [name, project, activityScope, density, shared ? 1 : 0, filterId, company],
  );

  const updated = await db.get<Record<string, unknown>>(
    `SELECT "id", "company", "userId", "userName", "name", "project", "activityScope", "density", "shared", "createdAt", "updatedAt"
     FROM "DashboardFilter"
     WHERE "id" = ? AND "company" = ? AND "deletedAt" IS NULL`,
    [filterId, company],
  );

  const userName = String(filter.userName ?? "");
  await logActivity(company, "DashboardFilter", String(filterId), "Updated", `${userName} updated filter "${name}"`, userName);

  if (!updated) return {};

  return {
    filter: {
      id: Number(updated.id),
      company: String(updated.company ?? ""),
      userId: Number(updated.userId ?? 0),
      userName: String(updated.userName ?? ""),
      name: String(updated.name ?? ""),
      project: String(updated.project ?? ""),
      activityScope: String(updated.activityScope ?? "team"),
      density: String(updated.density ?? "comfortable"),
      shared: Number(updated.shared ?? 0),
      createdAt: String(updated.createdAt ?? ""),
      updatedAt: String(updated.updatedAt ?? ""),
    },
  };
}

/**
 * Soft-delete a filter. Only the owner can delete.
 * Calls logActivity on deletion.
 * Returns success or an error string.
 */
export async function deleteFilter(
  company: string,
  userId: number,
  filterId: number
): Promise<{ success?: boolean; error?: string }> {
  // Verify ownership
  const filter = await db.get<Record<string, unknown>>(
    `SELECT "id", "userId", "name", "userName" FROM "DashboardFilter"
     WHERE "id" = ? AND "company" = ? AND "deletedAt" IS NULL`,
    [filterId, company],
  );

  if (!filter) {
    return { error: "Filter not found" };
  }

  if (Number(filter.userId) !== userId) {
    return { error: "Only the filter owner can delete this filter" };
  }

  // Soft-delete
  await db.run(
    `UPDATE "DashboardFilter" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "company" = ?`,
    [filterId, company],
  );

  // Log activity
  const filterName = String(filter.name ?? "");
  const userName = String(filter.userName ?? "");
  await logActivity(company, "DashboardFilter", String(filterId), "Deleted", `${userName} deleted filter "${filterName}"`, userName);

  return { success: true };
}
