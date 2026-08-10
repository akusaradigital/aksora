import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { moduleConfigs, type ModuleKey } from "@/lib/modules";
import { deleteAssigneeForUser } from "@/lib/user-assignee-sync";
import { deleteSearchTokens, shouldIndexModule, syncSearchTokens } from "@/lib/search-index";
import {
  getAccessScope,
  getTableName,
  logActivity,
} from "@/lib/data-helpers";
import { invalidateDashboardCache } from "@/lib/data/data-dashboard-stats";
import { getModuleRows } from "@/lib/data-module-read";

async function selectAll(sqlStr: string, params: any[] = []): Promise<Array<Record<string, string | number | null>>> {
  return db.query<Record<string, string | number | null>>(sqlStr, params);
}

async function syncSearchIndex(module: ModuleKey, company: string, entityId: string | number, data: Record<string, unknown>) {
  if (!shouldIndexModule(module)) return;
  try {
    await syncSearchTokens(module, company, entityId, data);
  } catch (e) {
    console.warn(`syncSearchIndex failed for ${module}/${entityId} (non-critical):`, e);
  }
}

async function clearSearchIndex(module: ModuleKey, company: string, entityId: string | number) {
  if (!shouldIndexModule(module)) return;
  try {
    await deleteSearchTokens(module, company, entityId);
  } catch (e) {
    console.warn(`clearSearchIndex failed for ${module}/${entityId} (non-critical):`, e);
  }
}

export async function deleteModuleRecord(module: ModuleKey, id: string | number) {
  const currentUser = await getCurrentUser();
  const scope = getAccessScope(currentUser);
  const { company, andWhere: companyFilter, params: companyParam } = scope;
  const actor = currentUser?.name || currentUser?.email || "";

  const table = getTableName(module);
  if (!table) return null;

  const entityId = String(id);

  if (table === "User") {
    await deleteAssigneeForUser(Number(id));
  }

  // Cascade: soft-delete linked Sprint when a TestPlan is deleted — only when
  // no OTHER active plan in the company still references that sprint name.
  if (module === "test-plans") {
    const plan = await db.get<{ sprint?: string }>(
      `SELECT "sprint" FROM "TestPlan" WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
      [id, ...companyParam],
    );
    if (plan?.sprint) {
      const stillReferenced = await db.get<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM "TestPlan"
         WHERE "sprint" = ? AND "company" = ? AND "deletedAt" IS NULL AND "id" != CAST(? AS INTEGER)`,
        [plan.sprint, company, id],
      );
      if (Number(stillReferenced?.cnt ?? 0) === 0) {
        await db.run(
          `UPDATE "Sprint" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "name" = ? AND "company" = ? AND "deletedAt" IS NULL`,
          [plan.sprint, company],
        );
      }
    }
  }

  const res = await db.run(`UPDATE "${table}" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = CAST(? AS INTEGER)${companyFilter}`, [id, ...companyParam]);
  await logActivity(company, table, entityId, "Deleted", `${table} removed`, actor);
  await clearSearchIndex(module, company, entityId);
  if (table === "User") {
    await clearSearchIndex("assignees", company, entityId);
  }
  invalidateDashboardCache(company);
  return res;
}

export async function deleteModuleRecords(module: ModuleKey, ids: (string | number)[]) {
  if (ids.length === 0) return;
  const currentUser = await getCurrentUser();
  const scope = getAccessScope(currentUser);
  const { company, andWhere: companyFilter, params: companyParam } = scope;
  const actor = currentUser?.name || currentUser?.email || "";

  const table = getTableName(module);
  if (!table) return;

  const placeholderList = ids.map(() => "?").join(", ");

  // Cascade: soft-delete linked Sprints when TestPlans are bulk-deleted — only
  // when no OTHER active plan in the company still references that sprint name.
  if (module === "test-plans") {
    const plans = await db.query<{ sprint?: string }>(
      `SELECT "sprint" FROM "TestPlan" WHERE "id" IN (${placeholderList})${companyFilter}`,
      [...ids, ...companyParam],
    );
    const sprintNames = plans.map((p) => p.sprint).filter(Boolean) as string[];
    if (sprintNames.length > 0) {
      const sprintPlaceholders = sprintNames.map(() => "?").join(", ");
      const idPlaceholders = ids.map(() => "?").join(", ");
      const stillReferenced = await db.query<{ name: string }>(
        `SELECT DISTINCT "sprint" as name FROM "TestPlan"
         WHERE "sprint" IN (${sprintPlaceholders}) AND "company" = ? AND "deletedAt" IS NULL AND "id" NOT IN (${idPlaceholders})`,
        [...sprintNames, company, ...ids],
      );
      const referencedNames = new Set(stillReferenced.map((r) => r.name));
      const deletable = sprintNames.filter((name) => !referencedNames.has(name));
      if (deletable.length > 0) {
        const deletePlaceholders = deletable.map(() => "?").join(", ");
        await db.run(
          `UPDATE "Sprint" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "name" IN (${deletePlaceholders}) AND "company" = ? AND "deletedAt" IS NULL`,
          [...deletable, company],
        );
      }
    }
  }

  await db.run(
    `UPDATE "${table}" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id IN (${placeholderList})${companyFilter}`,
    [...ids, ...companyParam]
  );

  await logActivity(company, table, ids.join(","), "Deleted", `${ids.length} ${table} records deleted`, actor);
  for (const entityId of ids) {
    await clearSearchIndex(module, company, String(entityId));
    if (table === "User") {
      await clearSearchIndex("assignees", company, String(entityId));
    }
  }
  invalidateDashboardCache(company);
}

export async function updateModuleStatus(module: ModuleKey, id: string | number, status: string, sortOrder?: number) {
  const currentUser = await getCurrentUser();
  const { company, andWhere, params: qParams } = getAccessScope(currentUser);
  const actor = currentUser?.name || currentUser?.email || "";

  const table = getTableName(module);
  if (!table) return null;
  const hasSortOrder = typeof sortOrder === "number" && Number.isFinite(sortOrder);
  const res = await db.run(
    `UPDATE "${table}" SET "status" = ?, ${hasSortOrder ? '"sortOrder" = ?, ' : ''}"updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
    hasSortOrder ? [status, sortOrder, id, ...qParams] : [status, id, ...qParams]
  );
  await logActivity(company, table, String(id), "Status Update", `${table} status updated to ${status}`, actor);
  const updatedRow = await db.get<Record<string, unknown>>(`SELECT * FROM "${table}" WHERE id = CAST(? AS INTEGER)${andWhere}`, [id, ...qParams]);
  if (updatedRow) {
    await syncSearchIndex(module, company, String(id), updatedRow);
  }
  invalidateDashboardCache(company);
  return res;
}

export async function batchUpdateSortOrder(module: ModuleKey, items: { id: string | number; sortOrder: number; status?: string }[]) {
  const currentUser = await getCurrentUser();
  const { company, andWhere, params: qParams } = getAccessScope(currentUser);

  const table = getTableName(module);
  if (!table) return null;

  for (const item of items) {
    if (item.status) {
      await db.run(
        `UPDATE "${table}" SET "sortOrder" = ?, "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
        [item.sortOrder, item.status, item.id, ...qParams]
      );
    } else {
      await db.run(
        `UPDATE "${table}" SET "sortOrder" = ? WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
        [item.sortOrder, item.id, ...qParams]
      );
    }
  }
  invalidateDashboardCache(company);
  return { updated: items.length };
}

export async function clearModuleRecords(module: ModuleKey) {
  const currentUser = await getCurrentUser();
  const { company, where, params } = getAccessScope(currentUser);
  const actor = currentUser?.name || currentUser?.email || "";

  const table = getTableName(module);
  if (!table) return null;
  const rows = shouldIndexModule(module) ? await selectAll(`SELECT "id" FROM "${table}"${where}`, params) : [];
  const res = await db.run(`DELETE FROM "${table}"${where}`, params);
  await logActivity(company, table, "ALL", "Cleared", `${table} records cleared`, actor);
  for (const row of rows) {
    await clearSearchIndex(module, company, String(row.id));
    if (table === "User") {
      await clearSearchIndex("assignees", company, String(row.id));
    }
  }
  invalidateDashboardCache(company);
  return res;
}

export async function replaceModuleRecords(module: ModuleKey, rows: any[]) {
  const { createModuleRecord } = await import("@/lib/data/data-crud-create");
  for (const row of rows) {
    await createModuleRecord(module, row);
  }
}

export async function getModuleSheetRows(module: ModuleKey) {
  const rows = await getModuleRows(module);
  return rows.map((row) => moduleConfigs[module].toRow(row as Record<string, unknown>));
}
