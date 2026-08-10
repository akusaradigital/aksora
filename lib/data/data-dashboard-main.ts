import { db } from "@/lib/db";
import { codeFromId } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { countRows, getAccessScope } from "@/lib/data-helpers";
import { getQualityTrend, getReleaseNotes } from "@/lib/test-management-data";
import {
  selectAll,
  safeQuery,
  dashboardCache,
  dashboardCacheKey,
  computeResolutionRate,
  computeResolutionRateDelta,
  invalidateDashboardCache,
} from "@/lib/data/data-dashboard-stats";

export async function getDashboardData(filterProject?: string): Promise<any> {
  const user = await getCurrentUser();
  const { company, isAdmin } = getAccessScope(user);
  const userRole = user?.role || "user";
  const rolePersona = userRole;
  const normalizedProject = String(filterProject ?? "").trim();
  const cacheKey = dashboardCacheKey(company, isAdmin, userRole, filterProject || "");
  const cached = dashboardCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return structuredClone(cached.data as object);
  }

  const companyWhere = isAdmin ? "" : `WHERE "company" = ?`;
  const companyAndWhere = isAdmin ? "" : `AND "company" = ?`;
  const companyParams = isAdmin ? [] : [company];
  const projectWhere = normalizedProject
    ? (isAdmin ? ` WHERE "project" = ?` : ` WHERE "company" = ? AND "project" = ?`)
    : companyWhere;
  const projectAndWhere = normalizedProject
    ? (isAdmin ? ` AND "project" = ?` : ` AND "company" = ? AND "project" = ?`)
    : companyAndWhere;
  const projectParams = normalizedProject
    ? (isAdmin ? [normalizedProject] : [company, normalizedProject])
    : companyParams;

  const [
    tasks, 
    bugs, 
    testCases, 
    summaryCounts,
    taskStatus,
    bugSeverity,
    sprint,
    completionCounts,
    bugTrend,
    allSprints,
    activity,
    bugByModule,
    todayTasks,
    todayBugs,
    todaySessions,
    critBugs,
    prioTasks,
    suiteAndSessionCounts,
    recentSessions,
    weekPulseData,
  ] = await Promise.all([
    safeQuery(selectAll(`SELECT "id", "title", "priority", "status" FROM "Task" ${projectWhere} ORDER BY COALESCE("sortOrder", 0) ASC, "updatedAt" DESC LIMIT 5`, projectParams), []),
    safeQuery(selectAll(`SELECT "id", "title", "severity", "priority", "status" FROM "Bug" ${projectWhere} ORDER BY COALESCE("sortOrder", 0) ASC, "updatedAt" DESC LIMIT 5`, projectParams), []),
    safeQuery(selectAll(`SELECT "id", "caseName", "priority", "status" FROM "TestCase" ${companyWhere}${isAdmin ? "" : ' AND "deletedAt" IS NULL'} ORDER BY COALESCE("sortOrder", 0) ASC, "updatedAt" DESC LIMIT 5`, companyParams), []),
    safeQuery(db.get(
      `SELECT
         (SELECT COUNT(*) FROM "Task" WHERE "deletedAt" IS NULL${projectAndWhere}) AS taskCount,
         (SELECT COUNT(*) FROM "Bug" WHERE "deletedAt" IS NULL AND "status" NOT IN ('closed', 'resolved', 'fixed', 'rejected')${projectAndWhere}) AS bugCount,
         (SELECT COUNT(*) FROM "TestCase" WHERE "deletedAt" IS NULL${companyAndWhere}) AS caseCount
       `,
      [...projectParams, ...projectParams, ...companyParams],
    ) as Promise<any>, null),
    safeQuery(selectAll(`SELECT status, COUNT(*) as count FROM "Task" ${projectWhere} GROUP BY status`, projectParams), []),
    safeQuery(selectAll(`SELECT severity, COUNT(*) as count FROM "Bug" ${projectWhere} GROUP BY severity`, projectParams), []),
    safeQuery(db.get(`SELECT "id", "name", "startDate", "endDate", "status" FROM "Sprint" WHERE status = 'active' ${companyAndWhere} LIMIT 1`, companyParams) as Promise<any>, null),
    safeQuery(db.get(
      `SELECT
         (SELECT COUNT(*) FROM "Bug" WHERE status IN ('fixed', 'closed') ${projectAndWhere}) AS bugFixedCount,
         (SELECT COUNT(*) FROM "Task" WHERE status = 'completed' ${projectAndWhere}) AS taskCompletedCount
       `,
      [...projectParams, ...projectParams],
    ) as Promise<any>, null),
    safeQuery(selectAll(`SELECT date("createdAt") as date, COUNT(*) as count FROM "Bug" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere} GROUP BY date("createdAt") ORDER BY date ASC`, projectParams), []),
    safeQuery(selectAll(`SELECT id, name, "startDate", "endDate", status FROM "Sprint" ${companyWhere} ORDER BY "startDate" DESC LIMIT 20`, companyParams), []),
    safeQuery(selectAll(`SELECT "id", "entityType", "entityId", "action", "summary", "createdAt" FROM "ActivityLog" ${companyWhere} ORDER BY "createdAt" DESC LIMIT 10`, companyParams), []),
    safeQuery(selectAll(`SELECT module, COUNT(*) as count FROM "Bug" ${projectWhere} GROUP BY module LIMIT 10`, projectParams), []),
    safeQuery(selectAll(`SELECT 'Task' as type, title as label, status FROM "Task" WHERE date("updatedAt") = CURRENT_DATE ${projectAndWhere}`, projectParams), []),
    safeQuery(selectAll(`SELECT 'Bug' as type, title as label, status FROM "Bug" WHERE date("updatedAt") = CURRENT_DATE ${projectAndWhere}`, projectParams), []),
    safeQuery(selectAll(`SELECT 'Session' as type, scope as label, result FROM "TestSession" WHERE date("createdAt") = CURRENT_DATE ${projectAndWhere}`, projectParams), []),
    safeQuery(selectAll(`SELECT "id", "title", "severity", "updatedAt", (CURRENT_DATE - "updatedAt"::date) AS "ageDays" FROM "Bug" WHERE "severity" IN ('critical', 'high', 'P0', 'P1') AND "status" != 'closed' ${projectAndWhere} ORDER BY "createdAt" DESC`, projectParams), []),
    safeQuery(selectAll(`SELECT "id", "title", "priority", "updatedAt", (CURRENT_DATE - "updatedAt"::date) AS "ageDays" FROM "Task" WHERE "priority" IN ('High', 'Urgent', 'P0', 'P1') AND "status" != 'done' ${projectAndWhere} ORDER BY "createdAt" DESC`, projectParams), []),
    safeQuery(db.get(
      `SELECT
         (SELECT COUNT(*) FROM "TestSuite" ${companyWhere}${isAdmin ? "" : ' AND "deletedAt" IS NULL'}) AS suiteCount,
         (SELECT COUNT(*) FROM "TestSession" ${companyWhere}${isAdmin ? "" : ' AND "deletedAt" IS NULL'}) AS sessionCount
       `,
      [...companyParams, ...companyParams],
    ) as Promise<any>, null),
    safeQuery(selectAll(`SELECT id, date, tester, scope, "totalCases", passed, failed, blocked, result FROM "TestSession" ${projectWhere} ORDER BY date DESC LIMIT 10`, projectParams), []),
    safeQuery(db.get(
      `SELECT
         (SELECT COUNT(*) FROM "Bug" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS bugCreatedThisWeek,
         (SELECT COUNT(*) FROM "Task" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS taskCreatedThisWeek,
         (SELECT COUNT(*) FROM "Bug" WHERE "status" IN ('fixed', 'closed') AND "updatedAt" >= CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS bugResolvedThisWeek,
         (SELECT COUNT(*) FROM "Task" WHERE "status" IN ('done', 'completed') AND "updatedAt" >= CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS taskResolvedThisWeek,
         (SELECT COUNT(*) FROM "Bug" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '14 days' AND "createdAt" < CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS bugCreatedLastWeek,
         (SELECT COUNT(*) FROM "Task" WHERE "createdAt" >= CURRENT_DATE - INTERVAL '14 days' AND "createdAt" < CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS taskCreatedLastWeek,
         (SELECT COUNT(*) FROM "Bug" WHERE "status" IN ('fixed', 'closed') AND "updatedAt" >= CURRENT_DATE - INTERVAL '14 days' AND "updatedAt" < CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS bugResolvedLastWeek,
         (SELECT COUNT(*) FROM "Task" WHERE "status" IN ('done', 'completed') AND "updatedAt" >= CURRENT_DATE - INTERVAL '14 days' AND "updatedAt" < CURRENT_DATE - INTERVAL '7 days' ${projectAndWhere}) AS taskResolvedLastWeek
       `,
      [...projectParams, ...projectParams, ...projectParams, ...projectParams, ...projectParams, ...projectParams, ...projectParams, ...projectParams],
    ) as Promise<any>, null),
  ]);

  // Heatmap: merge 4 lightweight queries instead of 1 heavy CTE
  const [heatTaskCounts, heatBugCounts, heatSuiteCounts, heatPlanCounts] = await Promise.all([
    safeQuery(selectAll(`SELECT assignee as name, COUNT(*) as cnt FROM "Task" WHERE status != 'done' AND assignee != '' ${projectAndWhere} GROUP BY assignee`, projectParams), []),
    safeQuery(selectAll(`SELECT "suggestedDev" as name, COUNT(*) as cnt FROM "Bug" WHERE status != 'closed' AND "suggestedDev" != '' ${projectAndWhere} GROUP BY "suggestedDev"`, projectParams), []),
    safeQuery(selectAll(`SELECT assignee as name, COUNT(*) as cnt FROM "TestSuite" WHERE status != 'archived' AND assignee != '' ${companyAndWhere} GROUP BY assignee`, companyParams), []),
    safeQuery(selectAll(`SELECT assignee as name, COUNT(*) as cnt FROM "TestPlan" WHERE status != 'closed' AND assignee != '' ${projectAndWhere} GROUP BY assignee`, projectParams), []),
  ]);

  const heatmap = new Map<string, { taskCount: number; bugCount: number; suiteCount: number; planCount: number }>();
  for (const row of heatTaskCounts) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const entry = heatmap.get(name) || { taskCount: 0, bugCount: 0, suiteCount: 0, planCount: 0 };
    entry.taskCount = Number(row.cnt ?? 0);
    heatmap.set(name, entry);
  }
  for (const row of heatBugCounts) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const entry = heatmap.get(name) || { taskCount: 0, bugCount: 0, suiteCount: 0, planCount: 0 };
    entry.bugCount = Number(row.cnt ?? 0);
    heatmap.set(name, entry);
  }
  for (const row of heatSuiteCounts) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const entry = heatmap.get(name) || { taskCount: 0, bugCount: 0, suiteCount: 0, planCount: 0 };
    entry.suiteCount = Number(row.cnt ?? 0);
    heatmap.set(name, entry);
  }
  for (const row of heatPlanCounts) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const entry = heatmap.get(name) || { taskCount: 0, bugCount: 0, suiteCount: 0, planCount: 0 };
    entry.planCount = Number(row.cnt ?? 0);
    heatmap.set(name, entry);
  }
  const heatmapRes = [...heatmap.entries()].map(([name, counts]) => ({ name, ...counts }));

  let taskCount = Number(summaryCounts?.taskCount ?? 0);
  let bugCount = Number(summaryCounts?.bugCount ?? 0);
  let caseCount = Number(summaryCounts?.caseCount ?? 0);
  let suiteCount = Number(suiteAndSessionCounts?.suiteCount ?? 0);
  let sessionCount = Number(suiteAndSessionCounts?.sessionCount ?? 0);
  let bugFixed = { count: Number(completionCounts?.bugFixedCount ?? 0) };
  let taskCompleted = { count: Number(completionCounts?.taskCompletedCount ?? 0) };
  if (!summaryCounts) {
    const openBugRow = await db.get(
      `SELECT COUNT(*) as total FROM "Bug" WHERE "status" NOT IN ('closed', 'resolved', 'fixed', 'rejected')${company ? ' AND "company" = ?' : ""}`,
      company ? [company] : [],
    ) as { total?: number } | undefined;
    [taskCount, bugCount, caseCount] = await Promise.all([
      countRows("Task", company),
      Promise.resolve(Number(openBugRow?.total ?? 0)),
      countRows("TestCase", company),
    ]);
  }
  if (!suiteAndSessionCounts) {
    [suiteCount, sessionCount] = await Promise.all([
      countRows("TestSuite", company),
      countRows("TestSession", company),
    ]);
  }
  if (!completionCounts) {
    const [bugFixedCount, taskCompletedCount] = await Promise.all([
      db.get(`SELECT COUNT(*) as count FROM "Bug" WHERE status IN ('fixed', 'closed') ${projectAndWhere}`, projectParams) as Promise<any>,
      db.get(`SELECT COUNT(*) as count FROM "Task" WHERE status = 'completed' ${projectAndWhere}`, projectParams) as Promise<any>,
    ]);
    bugFixed = { count: Number(bugFixedCount?.count ?? 0) };
    taskCompleted = { count: Number(taskCompletedCount?.count ?? 0) };
  }

  const todayActivity = [...(todayTasks || []), ...(todayBugs || []), ...(todaySessions || [])];

  let sprintInfo = null;
  const sprintBurndown: { date: string; done: number; ideal: number }[] = [];
  if (sprint) {
    const [tTotal, tDone, burndownRows] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM "Task" WHERE "sprintId" = ?' + companyAndWhere, [sprint.id, ...companyParams]) as Promise<any>,
      db.get("SELECT COUNT(*) as count FROM \"Task\" WHERE \"sprintId\" = ? AND status = 'done'" + companyAndWhere, [sprint.id, ...companyParams]) as Promise<any>,
      selectAll(
        `SELECT date("updatedAt") as date, COUNT(*) as count FROM "Task"
         WHERE "sprintId" = ? AND status = 'done'
         AND date("updatedAt") BETWEEN ? AND ?
         ${companyAndWhere} GROUP BY date("updatedAt") ORDER BY date ASC`,
        [sprint.id, sprint.startDate, sprint.endDate, ...companyParams]
      ),
    ]);

    sprintInfo = {
      name: String(sprint.name),
      startDate: String(sprint.startDate),
      endDate: String(sprint.endDate),
      progress: Number(tTotal.count) > 0 ? Math.round((Number(tDone.count) / Number(tTotal.count)) * 100) : 0,
      taskTotal: Number(tTotal.count),
      taskDone: Number(tDone.count)
    };

    // Build cumulative burndown with ideal line
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const totalTasks = Number(tTotal.count);
    const doneByDate: Record<string, number> = {};
    for (const row of burndownRows as any[]) {
      doneByDate[String(row.date)] = Number(row.count);
    }
    let cumDone = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      if (dateStr > today) break;
      cumDone += doneByDate[dateStr] || 0;
      sprintBurndown.push({
        date: dateStr.slice(5),
        done: cumDone,
        ideal: Math.round((i / totalDays) * totalTasks),
      });
    }
  }

  // Pass rate per sprint (last 5 sprints)
  const sprintJoinClause = normalizedProject
    ? (isAdmin
      ? ' AND ts."project" = ?'
      : ' AND ts."company" = ? AND ts."project" = ?')
    : (isAdmin ? "" : ' AND ts."company" = ?');
  const sprintJoinParams = normalizedProject
    ? (isAdmin ? [normalizedProject] : [company, normalizedProject])
    : (isAdmin ? [] : [company]);
  const sprintWhereClause = isAdmin
    ? 'WHERE sp."deletedAt" IS NULL'
    : 'WHERE sp."company" = ? AND sp."deletedAt" IS NULL';
  const sprintWhereParams = isAdmin ? [] : [company];
  const sprintPassRateRows = await selectAll(
    `SELECT sp.id, sp.name, sp."startDate", sp."endDate",
            COALESCE(SUM(COALESCE(ts.passed, 0)), 0) AS passed,
            COALESCE(SUM(COALESCE(ts."totalCases", 0)), 0) AS totalCases,
            COUNT(ts.id) AS sessions
     FROM "Sprint" sp
     LEFT JOIN "TestSession" ts
       ON COALESCE(ts."date", '') != ''
      AND ts."date" BETWEEN sp."startDate" AND sp."endDate"
      ${sprintJoinClause}
     ${sprintWhereClause}
     GROUP BY sp.id, sp.name, sp."startDate", sp."endDate"
     ORDER BY sp."startDate" DESC
     LIMIT 5`,
    [...sprintJoinParams, ...sprintWhereParams],
  ) as any[];
  const sprintPassRates = sprintPassRateRows.map((sp: any) => {
    const totalPassed = Number(sp.passed ?? 0);
    const totalCases = Number(sp.totalCases ?? 0);
    return {
      name: String(sp.name).replace(/sprint\s*/i, "S").substring(0, 12),
      passRate: totalCases > 0 ? Math.round(totalPassed * 100 / totalCases) : 0,
      sessions: Number(sp.sessions ?? 0),
    };
  });

  const successRate = (bugCount + taskCount) > 0 ? Math.round(((Number(bugFixed.count) + Number(taskCompleted.count)) / (bugCount + taskCount)) * 100) : 0;
  
  // Dynamic spotlight project
  const mostActiveProject = await db.get(`SELECT project as name FROM "TestPlan" ${companyWhere} GROUP BY project ORDER BY COUNT(*) DESC LIMIT 1`, companyParams) as any;
  const spotlightName = mostActiveProject?.name || (taskCount > 0 || bugCount > 0 ? "Active Project" : "No active project");

  const data = {
    metrics: [
      { label: "Open Tasks", value: taskCount, caption: "Daily QA tasks currently being managed." },
      { label: "Bug Entries", value: bugCount, caption: "Defects with severity, priority, and evidence." },
      { label: "Test Cases", value: caseCount, caption: "Positive and negative scenarios ready for use." },
      { label: "Test Suites", value: suiteCount, caption: "Organized collections of test scenarios." },
      { label: "Sessions", value: sessionCount, caption: "Test execution sessions recorded." },
    ],
    recentSessions: (recentSessions || []).map((s: any) => ({
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
    rolePersona,
    distribution: {
      tasks: taskStatus.map(r => ({ name: String(r.status), value: Number(r.count) })),
      bugs: bugSeverity.map(r => ({ name: String(r.severity), value: Number(r.count) })),
      bugByModule: bugByModule.map(r => ({ module: String(r.module), count: Number(r.count) })),
    },
    todayActivity: todayActivity.map(r => ({ type: String(r.type), label: String(r.label), status: String(r.status) })),
    recent: {
      tasks: tasks.map((item) => ({
        id: Number(item.id),
        code: codeFromId("TASK", Number(item.id)),
        title: String(item.title ?? ""),
        priority: String(item.priority ?? ""),
        status: String(item.status ?? ""),
      })),
      bugs: bugs.map((item) => ({
        id: Number(item.id),
        code: codeFromId("BUG", Number(item.id)),
        title: String(item.title ?? ""),
        severity: String(item.severity ?? ""),
        priority: String(item.priority ?? ""),
        status: String(item.status ?? ""),
      })),
      testCases: testCases.map((item) => ({
        id: Number(item.id),
        code: codeFromId("TC", Number(item.id)),
        title: String(item.caseName ?? ""),
        priority: String(item.priority ?? "Medium"),
        status: String(item.status ?? "Pending"),
      })),
    },
    spotlight: {
       projectName: spotlightName,
       projectDescription: "Track and monitor QA progress across modules.",
       totalScenarios: caseCount,
       totalBugs: bugCount,
       completionRate: successRate,
       criticalBugs: (critBugs || []).map((b: any) => ({ 
         id: b.id,
         title: String(b.title), 
         severity: String(b.severity),
         code: codeFromId("BUG", Number(b.id)),
         statusChangedAt: b.updatedAt ? String(b.updatedAt) : null,
         ageDays: b.ageDays != null ? Number(b.ageDays) : null,
         moduleType: 'Bug' as const,
       })),
       priorityTasks: (prioTasks || []).map((t: any) => ({ 
         id: t.id,
         title: String(t.title), 
         priority: String(t.priority),
         code: codeFromId("TASK", Number(t.id)),
         statusChangedAt: t.updatedAt ? String(t.updatedAt) : null,
         ageDays: t.ageDays != null ? Number(t.ageDays) : null,
         moduleType: 'Task' as const,
       }))
    },
    sprintInfo: sprintInfo ? {
       ...sprintInfo,
       goal: "Complete all planned tasks for the current cycle."
    } : null,
    personalSuccessRate: successRate,
    heatmap: (heatmapRes || []).map((r: any) => ({
      name: String(r.name),
      taskCount: Number(r.taskCount),
      bugCount: Number(r.bugCount),
      suiteCount: Number(r.suiteCount),
      planCount: Number(r.planCount),
      total: Number(r.taskCount) + Number(r.bugCount) + Number(r.suiteCount) + Number(r.planCount)
    })),
    activity: (activity as Array<Record<string, unknown>>).map((item) => ({
      id: Number(item.id),
      entityType: String(item.entityType ?? ""),
      entityId: String(item.entityId ?? ""),
      action: String(item.action ?? ""),
      summary: String(item.summary ?? ""),
      createdAt: String(item.createdAt ?? ""),
    })),
    bugTrendData: bugTrend.map((r) => ({ date: String(r.date), count: Number(r.count) })),
    sprintBurndown,
    sprintPassRates: sprintPassRates.reverse(),
    weekPulse: {
      created: Number(weekPulseData?.bugCreatedThisWeek ?? 0) + Number(weekPulseData?.taskCreatedThisWeek ?? 0),
      resolved: Number(weekPulseData?.bugResolvedThisWeek ?? 0) + Number(weekPulseData?.taskResolvedThisWeek ?? 0),
      prevCreated: Number(weekPulseData?.bugCreatedLastWeek ?? 0) + Number(weekPulseData?.taskCreatedLastWeek ?? 0),
      prevResolved: Number(weekPulseData?.bugResolvedLastWeek ?? 0) + Number(weekPulseData?.taskResolvedLastWeek ?? 0),
    },
    resolutionRate: (() => {
      const created = Number(weekPulseData?.bugCreatedThisWeek ?? 0) + Number(weekPulseData?.taskCreatedThisWeek ?? 0);
      const resolved = Number(weekPulseData?.bugResolvedThisWeek ?? 0) + Number(weekPulseData?.taskResolvedThisWeek ?? 0);
      const prevCreated = Number(weekPulseData?.bugCreatedLastWeek ?? 0) + Number(weekPulseData?.taskCreatedLastWeek ?? 0);
      const prevResolved = Number(weekPulseData?.bugResolvedLastWeek ?? 0) + Number(weekPulseData?.taskResolvedLastWeek ?? 0);
      const current = computeResolutionRate(resolved, created);
      const previousWeek = computeResolutionRate(prevResolved, prevCreated);
      const delta = computeResolutionRateDelta(current, previousWeek);
      return { current, previousWeek, delta };
    })(),
    sprints: allSprints.map((s) => ({
      id: Number(s.id),
      name: String(s.name),
      startDate: String(s.startDate),
      endDate: String(s.endDate),
      status: String(s.status),
    })),
  };
  dashboardCache.set(cacheKey, { data, expiresAt: Date.now() + 30000 });
  return structuredClone(data as object);
}

export async function getReportsData() {
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const andWhere = isAdmin ? "" : ' WHERE "company" = ?';
  const qParams = isAdmin ? [] : [company];

  const [bugSeverity, bugStatus, testCaseStatus, bugTrend] = await Promise.all([
    selectAll(`SELECT "severity" as name, COUNT(*) as value FROM "Bug"${andWhere} GROUP BY "severity"`, qParams),
    selectAll(`SELECT "status" as name, COUNT(*) as value FROM "Bug"${andWhere} GROUP BY "status"`, qParams),
    selectAll(`SELECT "status" as name, COUNT(*) as value FROM "TestCase"${andWhere} GROUP BY "status"`, qParams),
    selectAll(`SELECT date("createdAt") as date, COUNT(*) as count FROM "Bug"${andWhere} GROUP BY date("createdAt") ORDER BY date ASC`, qParams),
  ]);

  return {
    bugSeverityData: bugSeverity.map((row) => ({ name: String(row.name), value: Number(row.value) })),
    bugStatusData: bugStatus.map((row) => ({ name: String(row.name), value: Number(row.value) })),
    testCaseStatusData: testCaseStatus.map((row) => ({ name: String(row.name), value: Number(row.value) })),
    bugTrendData: bugTrend.map((row) => ({ date: String(row.date), count: Number(row.count) })),
  };
}


export async function getResourceDetails(name: string) {
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const resourceCacheKey = `${company}|${isAdmin ? "admin" : "user"}|${name.toLowerCase()}`;
  const resourceCache = (globalThis as typeof globalThis & {
    __qaResourceDetailsCache?: Map<string, { expiresAt: number; data: unknown }>;
  }).__qaResourceDetailsCache ?? ((globalThis as typeof globalThis & {
    __qaResourceDetailsCache?: Map<string, { expiresAt: number; data: unknown }>;
  }).__qaResourceDetailsCache = new Map());
  const cached = resourceCache.get(resourceCacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return structuredClone(cached.data as object);
  }
  const andWhere = isAdmin ? "" : ' AND "company" = ?';
  const companyParam = isAdmin ? [] : [company];

  const [tasks, bugs, suites] = await Promise.all([
    selectAll(`SELECT id, "publicToken", title, status, priority FROM "Task" WHERE assignee = ? ${andWhere} AND status != 'done' ORDER BY "createdAt" DESC`, [name, ...companyParam]),
    selectAll(`SELECT id, "publicToken", title, status, severity as priority FROM "Bug" WHERE "suggestedDev" = ? ${andWhere} AND status NOT IN ('closed', 'rejected') ORDER BY "createdAt" DESC`, [name, ...companyParam]),
    selectAll(`SELECT id, "publicToken", title, status, 'N/A' as priority FROM "TestSuite" WHERE assignee = ? ${andWhere} AND status != 'archived' ORDER BY "createdAt" DESC`, [name, ...companyParam]),
  ]);

  const data = {
    tasks: tasks.map(t => ({ ...t, type: 'Task' })),
    bugs: bugs.map(b => ({ ...b, type: 'Bug' })),
    suites: suites.map(s => ({ ...s, type: 'Suite' })),
  };
  resourceCache.set(resourceCacheKey, { data, expiresAt: Date.now() + 30000 });
  return structuredClone(data as object);
}

export async function getExecutiveData() {
  const { company, isAdmin } = getAccessScope(await getCurrentUser());
  const andWhere = isAdmin ? "" : ' AND "company" = ?';
  const qp = isAdmin ? [] : [company];

  const [critRes, totalBugs, openT, tcPass, testCaseTotal] = await Promise.all([
    db.get(`SELECT COUNT(*) as count FROM "Bug" WHERE "severity" IN ('critical', 'high', 'P0', 'P1') AND "status" != 'closed'${andWhere}`, qp) as Promise<any>,
    countRows("Bug", isAdmin ? undefined : company),
    db.get(`SELECT COUNT(*) as count FROM "Task" WHERE "status" != 'done'${andWhere}`, qp) as Promise<any>,
    db.get(`SELECT COUNT(*) as count FROM "TestCase" WHERE "status" IN ('Passed', 'Success')${andWhere}`, qp) as Promise<any>,
    countRows("TestCase", isAdmin ? undefined : company),
  ]);

  const criticalBugs = Number(critRes.count);
  const openTasks = Number(openT.count);
  const testCasePass = Number(tcPass.count);
  
  const readiness = testCaseTotal > 0 ? Math.round((testCasePass / testCaseTotal) * 100) : 0;
  const bugDensity = totalBugs > 0 ? parseFloat((criticalBugs / totalBugs).toFixed(2)) : 0;

  const metrics = [
    { label: "Critical Defects", value: criticalBugs, trend: "down", status: criticalBugs > 5 ? "danger" : "warning" },
    { label: "Release Readiness", value: readiness + "%", trend: "up", status: readiness > 90 ? "success" : "warning" },
    { label: "Risk Factor", value: bugDensity, trend: "stable", status: Number(bugDensity) > 0.2 ? "danger" : "success" },
    { label: "Blockers", value: openTasks, trend: "down", status: openTasks > 10 ? "warning" : "success" },
  ];

  const [trend, notes, totalTasks, fBugs, cTasks] = await Promise.all([
    getQualityTrend(),
    getReleaseNotes(),
    countRows("Task", isAdmin ? undefined : company),
    db.get(`SELECT COUNT(*) as count FROM "Bug" WHERE "status" IN ('fixed', 'closed')${andWhere}`, qp) as Promise<any>,
    db.get(`SELECT COUNT(*) as count FROM "Task" WHERE "status" = 'completed'${andWhere}`, qp) as Promise<any>
  ]);

  const fixedBugs = Number(fBugs.count);
  const completedTasks = Number(cTasks.count);
  const totalActions = totalBugs + totalTasks;
  const totalSuccess = fixedBugs + completedTasks;
  const personalSuccessRate = totalActions > 0 ? Math.round((totalSuccess / totalActions) * 100) : 100;

  const isHealthy = (readiness >= 80 || testCaseTotal === 0) && criticalBugs === 0;
  const hasData = totalBugs > 0 || totalTasks > 0 || testCaseTotal > 0;

  return {
    metrics,
    trend,
    releaseNotes: notes,
    personalSuccessRate,
    summary: {
      health: !hasData ? "N/A" : (isHealthy ? "Healthy" : "Needs Attention"),
      message: !hasData 
        ? "No data recorded yet. Start by adding tasks or test cases to see the health assessment."
        : (isHealthy 
           ? "The project is currently in a stable state with a high pass rate." 
           : "Action required: Several high-severity defects are pending or pass rate is low."),
      planName: (await db.get(`SELECT "title" FROM "TestPlan" WHERE "deletedAt" IS NULL${andWhere} ORDER BY "updatedAt" DESC LIMIT 1`, qp) as any)?.title || "Master Test Strategy",
      projectName: (await db.get(`SELECT "project" FROM "TestPlan" WHERE "deletedAt" IS NULL${andWhere} ORDER BY "updatedAt" DESC LIMIT 1`, qp) as any)?.project || "All Active Projects"
    }
  };
}


