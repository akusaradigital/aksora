import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { normalizeRole, getRoleLabel } from "@/lib/roles";

/**
 * Clamp a value to [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the Quality Health Score as a weighted composite.
 * Formula: Math.floor(0.4 * clamp(resolutionRate, 0, 100) + 0.3 * clamp(inverseCriticalRatio, 0, 100) + 0.3 * clamp(testPassRate, 0, 100))
 * Null inputs are treated as 0. Result is always an integer in [0, 100].
 */
export function computeQualityHealthScore(
  resolutionRate: number | null,
  inverseCriticalRatio: number | null,
  testPassRate: number | null
): number {
  const r = clamp(resolutionRate ?? 0, 0, 100);
  const i = clamp(inverseCriticalRatio ?? 0, 0, 100);
  const t = clamp(testPassRate ?? 0, 0, 100);
  return Math.floor(0.4 * r + 0.3 * i + 0.3 * t);
}

/**
 * Compute resolution rate as a percentage.
 * Returns null when created is 0 (N/A case).
 */
export function computeResolutionRate(resolved: number, created: number): number | null {
  if (created === 0) return null;
  return Math.round((resolved / created) * 100);
}

/**
 * Compute resolution rate delta (current - previous).
 * Returns null if either rate is null.
 */
export function computeResolutionRateDelta(
  current: number | null,
  previousWeek: number | null
): number | null {
  if (current === null || previousWeek === null) return null;
  return current - previousWeek;
}

export async function selectAll(sqlStr: string, params: any[] = []): Promise<Array<Record<string, string | number | null>>> {
  return db.query<Record<string, string | number | null>>(sqlStr, params);
}

/**
 * Wraps a promise so it never rejects - returns fallback on error.
 * Used for graceful degradation in dashboard queries.
 */
export async function safeQuery<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[dashboard] query failed gracefully:", err instanceof Error ? err.message : err);
    }
    return fallback;
  }
}

type DashboardCacheEntry = { expiresAt: number; data: unknown };
export const dashboardCache = new Map<string, DashboardCacheEntry>();
export const dashboardProjectsCache = new Map<string, DashboardCacheEntry>();

export function dashboardCacheKey(company: string, isAdmin: boolean, role: string, projectFilter: string) {
  return [company, isAdmin ? "admin" : "user", role, projectFilter || "__all__"].join("|");
}

export function invalidateDashboardCache(company?: string) {
  if (!company) {
    dashboardCache.clear();
    dashboardProjectsCache.clear();
    return;
  }
  const prefix = `${company}|`;
  for (const key of dashboardCache.keys()) {
    if (key.startsWith(prefix)) dashboardCache.delete(key);
  }
  for (const key of dashboardProjectsCache.keys()) {
    if (key.startsWith(prefix)) dashboardProjectsCache.delete(key);
  }
}

export async function getBugSeverityCounts(company: string, isAdmin: boolean): Promise<{ critical: number; high: number; medium: number; low: number }> {
  const andCompany = isAdmin ? "" : ` AND "company" = ?`;
  const params = isAdmin ? [] : [company];

  const rows = await selectAll(
    `SELECT LOWER(COALESCE("severity", '')) as sev, COUNT(*) as count
     FROM "Bug"
     WHERE "status" NOT IN ('closed', 'resolved', 'fixed', 'rejected')${andCompany}
     GROUP BY LOWER(COALESCE("severity", ''))`,
    params,
  );

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows) {
    const sev = String(row.sev ?? "").trim().toLowerCase();
    if (sev === "critical" || sev === "p0") counts.critical += Number(row.count ?? 0);
    else if (sev === "high" || sev === "p1") counts.high += Number(row.count ?? 0);
    else if (sev === "medium" || sev === "p2") counts.medium += Number(row.count ?? 0);
    else if (sev === "low" || sev === "p3") counts.low += Number(row.count ?? 0);
  }
  return counts;
}

/**
 * Get test pass rate: (passed / total executed tests) * 100.
 * Returns null when total executed tests is 0.
 */
export async function getTestPassRate(company: string, isAdmin: boolean): Promise<number | null> {
  const andCompany = isAdmin ? "" : ` AND "company" = ?`;
  const params = isAdmin ? [] : [company];

  const row = await db.get<{ totalPassed: number | string | null; totalExecuted: number | string | null }>(
    `SELECT
       COALESCE(SUM(CAST("passed" AS INTEGER)), 0) AS "totalPassed",
       COALESCE(SUM(CAST("totalCases" AS INTEGER)), 0) AS "totalExecuted"
     FROM "TestSession"
     WHERE "deletedAt" IS NULL${andCompany}`,
    params,
  );

  const totalPassed = Number(row?.totalPassed ?? 0);
  const totalExecuted = Number(row?.totalExecuted ?? 0);

  if (totalExecuted === 0) return null;
  return Math.round((totalPassed / totalExecuted) * 100);
}

export async function getDashboardProjects() {
  const user = await getCurrentUser();
  if (!user) return [] as string[];

  const { company, isAdmin } = getAccessScope(user);
  const cacheKey = `${company}|${isAdmin ? "admin" : "user"}`;
  const cached = dashboardProjectsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return structuredClone(cached.data as string[]);
  }

  const andCompany = isAdmin ? "" : ` AND "company" = ?`;
  const cp = isAdmin ? [] : [company];
  const rows = await db.query(
    `SELECT DISTINCT project FROM "TestPlan" WHERE COALESCE(project, '') != '' AND "deletedAt" IS NULL${andCompany}
     UNION
     SELECT DISTINCT project FROM "Bug" WHERE COALESCE(project, '') != ''${andCompany}
     UNION
     SELECT DISTINCT project FROM "Task" WHERE COALESCE(project, '') != ''${andCompany}
     ORDER BY project ASC`,
    [...cp, ...cp, ...cp],
  ) as Array<{ project: string }>;

  const projects = rows.map((row) => String(row.project));
  dashboardProjectsCache.set(cacheKey, { data: projects, expiresAt: Date.now() + 60000 });
  return projects;
}

export async function getProjectOptions() {
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const rows = await selectAll(
    `SELECT DISTINCT "project" as value FROM "TestPlan"
     WHERE COALESCE("project", '') != '' AND "deletedAt" IS NULL${isAdmin ? "" : ' AND "company" = ?'}
     ORDER BY "project" ASC`,
    isAdmin ? [] : [company],
  );
  return rows.map((row) => ({ value: String(row.value ?? ""), label: String(row.value ?? "") }));
}

export async function getBacklogOptions() {
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const rows = await selectAll(
    `SELECT id, title, "project"
     FROM "TestPlan"
     WHERE COALESCE(title, '') != '' AND "deletedAt" IS NULL${isAdmin ? "" : ' AND "company" = ?'}
     ORDER BY "updatedAt" DESC`,
    isAdmin ? [] : [company],
  );
  return rows.map((row) => ({
    value: String(row.title ?? ""),
    label: row.project ? `${String(row.title ?? "")} (${String(row.project ?? "")})` : String(row.title ?? ""),
  }));
}

export async function getAssigneeOptions() {
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const rows = await selectAll(
    `SELECT DISTINCT COALESCE("name", "email") as value, "role"
     FROM "User"
     WHERE (COALESCE("name", '') != '' OR COALESCE("email", '') != '') AND "deletedAt" IS NULL
     ${isAdmin ? "" : ' AND "company" = ?'}
     ORDER BY COALESCE("name", "email") ASC`,
    isAdmin ? [] : [company],
  );
  return rows
    .filter((row) => normalizeRole(String(row.role ?? "")) !== "admin")
    .map((row) => {
      const name = String(row.value ?? "").trim();
      const role = normalizeRole(String(row.role ?? "").trim());
      return {
        value: name,
        label: role ? `${name} (${getRoleLabel(role)})` : name,
        role,
      };
    })
    .filter((row) => Boolean(row.value));
}

export async function getTestPlanReferenceRows() {
  const { company: _company, isAdmin: _isAdmin, andWhere, params: qParams } = getAccessScope(await getCurrentUser());
  const rows = await selectAll(
    `SELECT "id", "title", "project", "publicToken", "sprint", "updatedAt"
     FROM "TestPlan"
     WHERE "deletedAt" IS NULL ${andWhere}
     ORDER BY "updatedAt" DESC`,
    qParams,
  );
  return rows.map((item) => ({
    id: String(item.id ?? ""),
    title: String(item.title ?? ""),
    project: String(item.project ?? ""),
    publicToken: String(item.publicToken ?? ""),
    sprint: String(item.sprint ?? ""),
  }));
}

export async function getTestSuitesByPlanIds(planIds: Array<string | number>) {
  const ids = planIds.map((id) => String(id)).filter(Boolean);
  if (ids.length === 0) return [];
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const rows = await selectAll(
    `SELECT id, "testPlanId", title, "publicToken"
     FROM "TestSuite"
     WHERE "deletedAt" IS NULL
     ${isAdmin ? "" : ' AND "company" = ?'}
     AND "testPlanId" IN (${ids.map(() => "CAST(? AS TEXT)").join(", ")})
     ORDER BY "updatedAt" DESC`,
    isAdmin ? ids : [company, ...ids],
  );
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    testPlanId: String(row.testPlanId ?? ""),
    title: String(row.title ?? ""),
    token: String(row.publicToken ?? ""),
  }));
}

export async function getTestCaseStatsBySuiteIds(suiteIds: Array<string | number>) {
  const ids = suiteIds.map((id) => String(id)).filter(Boolean);
  if (ids.length === 0) return new Map<string, { passed: number; failed: number; total: number }>();
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const rows = await selectAll(
    `SELECT tc."testSuiteId" as suiteId,
      COUNT(*) as total,
      SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'passed' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN LOWER(COALESCE(tc."status", '')) = 'blocked' THEN 1 ELSE 0 END) as blocked
     FROM "TestCase" tc
     WHERE tc."deletedAt" IS NULL
     ${isAdmin ? "" : ' AND tc."company" = ?'}
     AND tc."testSuiteId" IN (${ids.map(() => "CAST(? AS TEXT)").join(", ")})
     GROUP BY tc."testSuiteId"`,
    isAdmin ? ids : [company, ...ids],
  );
  const stats = new Map<string, { passed: number; failed: number; total: number }>();
  for (const row of rows) {
    const key = String(row.suiteId ?? "");
    if (!key) continue;
    stats.set(key, {
      passed: Number(row.passed ?? 0),
      failed: Number(row.failed ?? 0),
      total: Number(row.total ?? 0),
    });
  }
  return stats;
}
