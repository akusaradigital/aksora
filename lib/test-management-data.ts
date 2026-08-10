import { db } from "@/lib/db";
import { codeFromId } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { normalizeTestPlanRow, normalizeTestSuiteRow, normalizeTestCaseRow, toDatetime } from "@/lib/data-helpers";

async function selectAll(sqlStr: string, params: unknown[] = []): Promise<Array<Record<string, string | number | null>>> {
  return db.query<Record<string, string | number | null>>(sqlStr, params);
}

type ReadScope = {
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  company: string;
  isAdmin: boolean;
  cacheScope: string;
};

type DetailCacheEntry<T> = { expiresAt: number; data: T };
const detailCache = new Map<string, DetailCacheEntry<unknown>>();

async function getReadScope(): Promise<ReadScope> {
  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  return {
    user,
    company,
    isAdmin,
    cacheScope: `${company}|${isAdmin ? "admin" : "user"}|${user ? "auth" : "public"}`,
  };
}

function getCached<T>(key: string): T | null {
  const entry = detailCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    detailCache.delete(key);
    return null;
  }
  return structuredClone(entry.data as T);
}

function setCached<T>(key: string, data: T, ttlMs = 15000): T {
  detailCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return structuredClone(data);
}

function cacheKey(prefix: string, scope: ReadScope, value: string) {
  return `${prefix}|${scope.cacheScope}|${value}`;
}

function groupCasesBySuite(rows: Array<Record<string, string | number | null>>) {
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  for (const row of rows) {
    const suiteId = String(row.testSuiteId ?? "");
    if (!suiteId) continue;
    const bucket = grouped[suiteId] ?? (grouped[suiteId] = []);
    bucket.push({
      ...normalizeTestCaseRow(row),
      code: codeFromId("TC", Number(row.id)),
    });
  }
  return grouped;
}

export async function getTestPlanByToken(token: string) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cached = getCached<ReturnType<typeof normalizeTestPlanRow> | null>(cacheKey("plan-token", scope, token));
  if (cached !== null) return cached;
  const item = shouldFilter
    ? await db.get(
        'SELECT id, company, "publicToken", title, project, sprint, scope, status, "startDate", "endDate", assignee, notes, "updatedAt" FROM "TestPlan" WHERE "publicToken" = ? AND "deletedAt" IS NULL AND "company" = ?',
        [token, scope.company],
      ) as Record<string, unknown> | undefined
    : await db.get(
        'SELECT id, company, "publicToken", title, project, sprint, scope, status, "startDate", "endDate", assignee, notes, "updatedAt" FROM "TestPlan" WHERE "publicToken" = ? AND "deletedAt" IS NULL',
        [token],
      ) as Record<string, unknown> | undefined;
  if (!item) return null;
  return setCached(cacheKey("plan-token", scope, token), normalizeTestPlanRow(item));
}

export async function getTestPlanById(planId: string | number) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const id = String(planId ?? "");
  const cached = getCached<ReturnType<typeof normalizeTestPlanRow> | null>(cacheKey("plan-id", scope, id));
  if (cached !== null) return cached;
  const item = shouldFilter
    ? await db.get(
        'SELECT id, company, "publicToken", title, project, sprint, scope, status, "startDate", "endDate", assignee, notes, "updatedAt" FROM "TestPlan" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND "company" = ?',
        [planId, scope.company],
      ) as Record<string, unknown> | undefined
    : await db.get(
        'SELECT id, company, "publicToken", title, project, sprint, scope, status, "startDate", "endDate", assignee, notes, "updatedAt" FROM "TestPlan" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL',
        [planId],
      ) as Record<string, unknown> | undefined;
  if (!item) return null;
  return setCached(cacheKey("plan-id", scope, id), normalizeTestPlanRow(item));
}

export async function getTestSuitesByPlanId(planId: string) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cached = getCached<Array<ReturnType<typeof normalizeTestSuiteRow>>>(cacheKey("suites-plan", scope, planId));
  if (cached !== null) return cached;
  const rows = await selectAll(
    shouldFilter
      ? 'SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "testPlanId" = ? AND "deletedAt" IS NULL AND "company" = ? ORDER BY "updatedAt" DESC'
      : 'SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "testPlanId" = ? AND "deletedAt" IS NULL ORDER BY "updatedAt" DESC',
    shouldFilter ? [planId, scope.company] : [planId],
  );
  return setCached(cacheKey("suites-plan", scope, planId), rows.map((item) => normalizeTestSuiteRow(item)));
}

export async function getReleaseNotes() {
  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const where = isAdmin ? "" : ' AND "company" = ?';
  const params = isAdmin ? [] : [company];

  const bugs = await selectAll(
    `SELECT id, title, severity, status, "updatedAt" FROM "Bug" WHERE "status" IN ('fixed', 'closed') ${where} ORDER BY "updatedAt" DESC LIMIT 20`,
    params,
  );
  const tasks = await selectAll(
    `SELECT id, title FROM "Task" WHERE "status" = 'completed' ${where} ORDER BY "updatedAt" DESC LIMIT 20`,
    params,
  );

  return {
    fixedBugs: bugs.map((b) => ({ code: codeFromId("BUG", Number(b.id)), title: b.title, severity: b.severity })),
    completedTasks: tasks.map((t) => ({ code: codeFromId("TASK", Number(t.id)), title: t.title })),
  };
}
export async function getQualityTrend() {
  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const andWhere = isAdmin ? "" : ' AND "company" = ?';
  const qParams = isAdmin ? [] : [company];

  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const start = new Date(d);
    start.setDate(start.getDate() - 7);
    weeks.push({ label: `Week -${i}`, start: toDatetime(start), end: toDatetime(d) });
  }

  return Promise.all(
    weeks.reverse().map(async (w) => {
      const [bugsRes, fixedRes] = await Promise.all([
        db.get<{ count?: number }>(`SELECT COUNT(*) as count FROM "Bug" WHERE "createdAt" BETWEEN ? AND ? ${andWhere}`, [w.start, w.end, ...qParams]),
        db.get<{ count?: number }>(`SELECT COUNT(*) as count FROM "Bug" WHERE "status" = 'fixed' AND "updatedAt" BETWEEN ? AND ? ${andWhere}`, [w.start, w.end, ...qParams]),
      ]);
      return { label: w.label, bugs: Number(bugsRes?.count ?? 0), fixed: Number(fixedRes?.count ?? 0) };
    }),
  );
}

export async function getTestSuite(id: string | number) {
  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const andWhere = isAdmin ? "" : ' AND "company" = ?';
  const qParams = isAdmin ? [] : [company];

  const item = await db.get(
    `SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE id = CAST(? AS INTEGER) AND "deletedAt" IS NULL ${andWhere}`,
    [id, ...qParams],
  ) as Record<string, unknown> | undefined;
  if (!item) return null;
  return { ...item, code: codeFromId("SUITE", Number(id)) };
}

export async function getTestCasesByIdStrings(idStrings: string) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cacheId = idStrings.trim();
  const cached = getCached<Array<Record<string, unknown>>>(cacheKey("cases-by-suite", scope, cacheId));
  if (cached !== null) return cached;
  const andWhere = shouldFilter ? ' AND "company" = ?' : "";
  const qParams = shouldFilter ? [scope.company] : [];

  if (!cacheId) return [];
  const rows = await selectAll(
    `SELECT id, company, "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", assignee, "testStep", "expectedResult", "actualResult", status, priority, evidence, "updatedAt"
     FROM "TestCase" WHERE "testSuiteId" = ? AND "deletedAt" IS NULL ${andWhere} ORDER BY "id" ASC`,
    [cacheId, ...qParams],
  );
  return setCached(cacheKey("cases-by-suite", scope, cacheId), rows.map((r) => ({ ...normalizeTestCaseRow(r), code: codeFromId("TC", Number(r.id)) })));
}

export async function getProjectData(projectName: string) {
  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const andWhere = isAdmin ? "" : ' AND "company" = ?';
  const qParams = isAdmin ? [] : [company];

  const [plans, bugs, tasks, sessions, meetings] = await Promise.all([
    selectAll(`SELECT id, company, "publicToken", title, project, sprint, status, "updatedAt" FROM "TestPlan" WHERE project = ? AND "deletedAt" IS NULL ${andWhere}`, [projectName, ...qParams]),
    selectAll(`SELECT id, company, project, module, title, severity, status, "suggestedDev", "createdAt" FROM "Bug" WHERE project = ? AND "deletedAt" IS NULL ${andWhere}`, [projectName, ...qParams]),
    selectAll(`SELECT id, company, title, project, relatedFeature, status, priority, description, assignee, "updatedAt" FROM "Task" WHERE project = ? AND "deletedAt" IS NULL ${andWhere}`, [projectName, ...qParams]),
    selectAll(`SELECT id, company, date, project, sprint, tester, scope, "totalCases", passed, failed, blocked, result, notes, "updatedAt" FROM "TestSession" WHERE project = ? AND "deletedAt" IS NULL ${andWhere}`, [projectName, ...qParams]),
    selectAll(`SELECT id, company, "publicToken", date, project, title, attendees, content, "actionItems", "updatedAt" FROM "MeetingNote" WHERE project = ? AND "deletedAt" IS NULL ${andWhere} ORDER BY "date" DESC`, [projectName, ...qParams]),
  ]);

  const planIds = plans.map((p) => String(p.id));
  let suites: Array<Record<string, string | number | null>> = [];
  if (planIds.length > 0) {
    const placeholders = planIds.map(() => "?").join(",");
    suites = await selectAll(
      `SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "testPlanId" IN (${placeholders}) AND "deletedAt" IS NULL ${andWhere}`,
      [...planIds, ...qParams],
    );
  }

  const suiteIds = suites.map((s) => String(s.id));
  let cases: Array<Record<string, string | number | null>> = [];
  if (suiteIds.length > 0) {
    const placeholders = suiteIds.map(() => "?").join(",");
    cases = await selectAll(
      `SELECT id, company, "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", assignee, "testStep", "expectedResult", "actualResult", status, priority, evidence, "updatedAt" FROM "TestCase" WHERE "testSuiteId" IN (${placeholders}) AND "deletedAt" IS NULL ${andWhere}`,
      [...suiteIds, ...qParams],
    );
  }

  const totalCases = cases.length;
  const passed = cases.filter((c) => String(c.status).toLowerCase() === "passed").length;
  const failed = cases.filter((c) => String(c.status).toLowerCase() === "failed").length;
  const blocked = cases.filter((c) => String(c.status).toLowerCase() === "blocked").length;
  const pending = totalCases - passed - failed - blocked;

  const casesBySuite: Record<string, Array<Record<string, string | number | null>>> = {};
  for (const c of cases) {
    const sid = String(c.testSuiteId);
    if (!casesBySuite[sid]) casesBySuite[sid] = [];
    casesBySuite[sid].push(c);
  }

  const suitesWithStats = suites.map((s) => {
    const sc = casesBySuite[String(s.id)] || [];
    const sp = sc.filter((c) => String(c.status).toLowerCase() === "passed").length;
    const sf = sc.filter((c) => String(c.status).toLowerCase() === "failed").length;
    const sb = sc.filter((c) => String(c.status).toLowerCase() === "blocked").length;
    return {
      id: String(s.id),
      title: s.title,
      status: s.status,
      assignee: s.assignee || "",
      publicToken: s.publicToken || "",
      total: sc.length,
      passed: sp,
      failed: sf,
      blocked: sb,
      pending: sc.length - sp - sf - sb,
    };
  });

  const openStatuses = ["open", "in progress", "new", "reopen", "active"];
  const openBugs = bugs.filter((b) => openStatuses.includes(String(b.status).toLowerCase())).length;
  const openTasks = tasks.filter((t) => openStatuses.includes(String(t.status).toLowerCase())).length;

  return {
    projectName,
    plans: plans.map(normalizeTestPlanRow),
    bugs: bugs.map((b) => ({ ...b, code: codeFromId("BUG", Number(b.id)) })),
    tasks: tasks.map((t) => ({ ...t, code: codeFromId("TASK", Number(t.id)) })),
    sessions: sessions.map((s) => ({ ...s, code: codeFromId("SES", Number(s.id)) })),
    meetings: meetings.map((m) => ({ ...m, code: codeFromId("MEET", Number(m.id)) })),
    suites: suitesWithStats,
    stats: {
      totalPlans: plans.length,
      totalBugs: bugs.length,
      totalTasks: tasks.length,
      openBugs,
      openTasks,
      totalCases,
      passed,
      failed,
      blocked,
      pending,
      successRate: totalCases > 0 ? Math.round((passed / totalCases) * 100) : 0,
    },
  };
}

export async function getTestSuiteByToken(token: string) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cached = getCached<Record<string, unknown> | null>(cacheKey("suite-token", scope, token));
  if (cached !== null) return cached;
  const item = (shouldFilter
    ? await db.get(
        'SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "publicToken" = ? AND "deletedAt" IS NULL AND "company" = ?',
        [token, scope.company],
      )
    : await db.get(
        'SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "publicToken" = ? AND "deletedAt" IS NULL',
        [token],
      )) as Record<string, unknown> | undefined;
  if (!item) return null;
  return setCached(cacheKey("suite-token", scope, token), item);
}

export async function getTestCasesByScenario(suiteId: string | number) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cached = getCached<Array<Record<string, string | number | null>>>(cacheKey("cases-suite", scope, String(suiteId)));
  if (cached !== null) return cached;
  const rows = await selectAll(
    shouldFilter
      ? `SELECT id, company, "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", assignee, "testStep", "expectedResult", "actualResult", status, priority, evidence, "updatedAt" FROM "TestCase" WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL AND "company" = ? ORDER BY id ASC`
      : `SELECT id, company, "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", assignee, "testStep", "expectedResult", "actualResult", status, priority, evidence, "updatedAt" FROM "TestCase" WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL ORDER BY id ASC`,
    shouldFilter ? [suiteId, scope.company] : [suiteId],
  );
  return setCached(cacheKey("cases-suite", scope, String(suiteId)), rows);
}

export async function getTestCasesByScenarioIds(suiteIds: Array<string | number>) {
  const ids = suiteIds.map((id) => String(id)).filter(Boolean);
  if (ids.length === 0) return {};

  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cacheId = ids.join(",");
  const cached = getCached<Record<string, Array<Record<string, unknown>>>>(cacheKey("cases-suite-batch", scope, cacheId));
  if (cached !== null) return cached;

  const rows = await selectAll(
    `SELECT id, company, "publicToken", "testSuiteId", "tcId", "typeCase", "preCondition", "caseName", assignee, "testStep", "expectedResult", "actualResult", status, priority, evidence, "updatedAt" FROM "TestCase"
     WHERE "deletedAt" IS NULL
     ${shouldFilter ? ' AND "company" = ?' : ""}
     AND "testSuiteId" IN (${ids.map(() => "CAST(? AS TEXT)").join(", ")})
     ORDER BY "testSuiteId" ASC, id ASC`,
    shouldFilter ? [scope.company, ...ids] : ids,
  );
  return setCached(cacheKey("cases-suite-batch", scope, cacheId), groupCasesBySuite(rows));
}

export async function getPublicReportData(token: string) {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cached = getCached<unknown>(cacheKey("public-report", scope, token));
  if (cached !== null) return cached;

  const planRaw = await db.get(
    shouldFilter
      ? 'SELECT id, company, "publicToken", title, project, sprint, scope, status, "startDate", "endDate", assignee, notes, "updatedAt" FROM "TestPlan" WHERE "publicToken" = ? AND "deletedAt" IS NULL AND "company" = ?'
      : 'SELECT id, company, "publicToken", title, project, sprint, scope, status, "startDate", "endDate", assignee, notes, "updatedAt" FROM "TestPlan" WHERE "publicToken" = ? AND "deletedAt" IS NULL',
    shouldFilter ? [token, scope.company] : [token],
  ) as Record<string, unknown> | undefined;
  if (!planRaw) return null;

  const plan = normalizeTestPlanRow(planRaw) as ReturnType<typeof normalizeTestPlanRow> & Record<string, unknown>;
  const planId = String(plan.id);

  const suitesRaw = await selectAll(
    shouldFilter
      ? 'SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "testPlanId" = ? AND "deletedAt" IS NULL AND "company" = ? ORDER BY "updatedAt" DESC'
      : 'SELECT id, company, "publicToken", "testPlanId", title, assignee, status, notes, "updatedAt" FROM "TestSuite" WHERE "testPlanId" = ? AND "deletedAt" IS NULL ORDER BY "updatedAt" DESC',
    shouldFilter ? [planId, scope.company] : [planId],
  );
  const suites = suitesRaw.map(normalizeTestSuiteRow);

  const casesBySuiteId = await getTestCasesByScenarioIds(suites.map((suite) => suite.id));
  const suitesWithCases = suites.map((suite) => ({
    ...suite,
    cases: casesBySuiteId[String(suite.id)] ?? [],
  }));

  const allCases = suitesWithCases.flatMap((s) => s.cases);
  const passed = allCases.filter((c) => String(c.status).toLowerCase() === "passed").length;
  const failed = allCases.filter((c) => String(c.status).toLowerCase() === "failed").length;
  const blocked = allCases.filter((c) => String(c.status).toLowerCase() === "blocked").length;
  const pending = allCases.filter((c) => String(c.status).toLowerCase() === "pending").length;

  // Sessions for all suites of this plan
  const suiteIds = suites.map((s) => String(s.id));
  let sessions: Array<Record<string, string | number | null>> = [];
  if (suiteIds.length > 0) {
    const placeholders = suiteIds.map(() => "?").join(",");
    sessions = await selectAll(
      `SELECT id, company, date, project, sprint, tester, scope, "totalCases", passed, failed, blocked, result, notes, "updatedAt" FROM "TestSession" WHERE "scope" IN (${placeholders}) AND "deletedAt" IS NULL ${shouldFilter ? ' AND "company" = ?' : ""} ORDER BY "date" DESC LIMIT 15`,
      shouldFilter ? [...suites.map((s) => s.title), scope.company] : suites.map((s) => s.title),
    );
  }

  // Bugs for this plan's project
  const bugs = plan.project
    ? await selectAll(
        `SELECT id, title, severity, status, project FROM "Bug" WHERE "project" = ? AND "deletedAt" IS NULL AND "status" NOT IN ('closed','fixed') ${shouldFilter ? ' AND "company" = ?' : ""} ORDER BY "createdAt" DESC LIMIT 10`,
        shouldFilter ? [plan.project, scope.company] : [plan.project],
      )
    : [];

  return setCached(cacheKey("public-report", scope, token), {
    plan,
    suites: suitesWithCases,
    stats: {
      total: allCases.length,
      passed,
      failed,
      blocked,
      pending,
      passRate: allCases.length > 0 ? Math.round((passed / allCases.length) * 100) : 0,
    },
    sessions: sessions.map((s) => ({
      id: Number(s.id),
      date: String(s.date ?? ""),
      tester: String(s.tester ?? ""),
      scope: String(s.scope ?? ""),
      totalCases: Number(s.totalCases ?? 0),
      passed: Number(s.passed ?? 0),
      failed: Number(s.failed ?? 0),
      blocked: Number(s.blocked ?? 0),
      result: String(s.result ?? ""),
    })),
    bugs: bugs.map((b) => ({
      id: Number(b.id),
      code: codeFromId("BUG", Number(b.id)),
      title: String(b.title ?? ""),
      severity: String(b.severity ?? ""),
      status: String(b.status ?? ""),
    })),
  });
}

export async function getAllTestCasesWithSuite() {
  const scope = await getReadScope();
  const shouldFilter = scope.user && !scope.isAdmin;
  const cached = getCached<Array<Record<string, string | number | null>>>(cacheKey("all-test-cases", scope, "suite"));
  if (cached !== null) return cached;
  const andWhere = shouldFilter ? ' AND tc."company" = ?' : "";
  const qParams = shouldFilter ? [scope.company] : [];

  const rows = await selectAll(
    `SELECT tc.*, ts.title AS "suiteTitle", ts."publicToken" AS "suiteToken", ts.status AS "suiteStatus",
            ts.assignee AS "suiteAssignee",
            tp.title AS "planTitle", tp.project AS "planProject"
     FROM "TestCase" tc
      LEFT JOIN "TestSuite" ts ON ts.id = CAST(tc."testSuiteId" AS INTEGER) AND ts."deletedAt" IS NULL
      LEFT JOIN "TestPlan" tp ON tp.id = CAST(ts."testPlanId" AS INTEGER) AND tp."deletedAt" IS NULL
     WHERE tc."deletedAt" IS NULL${andWhere}
     ORDER BY tc."testSuiteId" ASC, tc.id ASC`,
    qParams,
  );

  return setCached(cacheKey("all-test-cases", scope, "suite"), rows.map((r) => ({
    ...normalizeTestCaseRow(r),
    suiteTitle: String(r.suiteTitle ?? ""),
    suiteToken: String(r.suiteToken ?? ""),
    suiteStatus: String(r.suiteStatus ?? ""),
    suiteAssignee: String(r.suiteAssignee ?? ""),
    planTitle: String(r.planTitle ?? ""),
    planProject: String(r.planProject ?? ""),
  })));
}
