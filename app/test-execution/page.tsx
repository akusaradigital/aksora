import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";
import { PageShell } from "@/components/layout/page-shell";
import { Play } from "@phosphor-icons/react/dist/ssr/Play";
import { ExecutionSuiteCards } from "./execution-suite-cards";
import { SuitesHeaderActions } from "@/components/test-management/suites-header-actions";

export const dynamic = "force-dynamic";

export default async function TestExecutionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const query = searchParams ? await searchParams : {};
  const initialSearch = typeof query.q === "string" ? query.q : Array.isArray(query.q) ? query.q[0] : "";

  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND s."company" = ?';
  const companyParams = isAdmin ? [] : [company];

  // Get suites with their latest run info
  const suites = await db.query<Record<string, unknown>>(
    `SELECT s."id", s."title", s."status", s."assignee", s."notes", s."publicToken", s."testPlanId",
            (SELECT COUNT(*) FROM "TestCase" tc WHERE tc."testSuiteId" = CAST(s."id" AS TEXT) AND tc."deletedAt" IS NULL) as "caseCount"
     FROM "TestSuite" s
     WHERE s."status" != 'archived' AND s."deletedAt" IS NULL${companyFilter}
     ORDER BY s."updatedAt" DESC`,
    [...companyParams]
  );

  // Get latest run for each suite
  const suiteIds = suites.map(s => Number(s.id));
  const latestRuns: Record<number, Record<string, unknown>> = {};

  if (suiteIds.length > 0) {
    // Get all runs and pick latest per suite in JS (avoids complex SQL)
    const allRuns = await db.query<Record<string, unknown>>(
      `SELECT * FROM "ExecutionRun"
       WHERE "deletedAt" IS NULL${isAdmin ? "" : ' AND "company" = ?'}
       ORDER BY "runNumber" DESC`,
      isAdmin ? [] : [company]
    );

    for (const run of allRuns) {
      const sid = Number(run.testSuiteId);
      if (!latestRuns[sid]) {
        latestRuns[sid] = run;
      }
    }
  }

  // Get plans for grouping
  const plans = await db.query<Record<string, unknown>>(
    `SELECT "id", "title", "project" FROM "TestPlan" WHERE "deletedAt" IS NULL${isAdmin ? "" : ' AND "company" = ?'}`,
    isAdmin ? [] : [company]
  );
  const planMap = new Map<string, Record<string, unknown>>();
  plans.forEach(p => planMap.set(String(p.id), p));

  // Build enriched suite data
  const enrichedSuites = suites.map(s => {
    const suiteId = Number(s.id);
    const plan = planMap.get(String(s.testPlanId));
    const lastRun = latestRuns[suiteId] || null;

    return {
      id: suiteId,
      title: String(s.title),
      status: String(s.status),
      assignee: String(s.assignee || ""),
      notes: String(s.notes || ""),
      publicToken: String(s.publicToken),
      testPlanId: String(s.testPlanId || ""),
      caseCount: Number(s.caseCount) || 0,
      project: String(plan?.project || "General"),
      planName: String(plan?.title || "Standalone"),
      lastRun: lastRun ? {
        id: Number(lastRun.id),
        runNumber: Number(lastRun.runNumber),
        status: String(lastRun.status),
        tester: String(lastRun.tester || ""),
        passed: Number(lastRun.passed) || 0,
        failed: Number(lastRun.failed) || 0,
        blocked: Number(lastRun.blocked) || 0,
        totalCases: Number(lastRun.totalCases) || 0,
        startedAt: String(lastRun.startedAt || ""),
        completedAt: lastRun.completedAt ? String(lastRun.completedAt) : null,
      } : null,
    };
  });

  // Filter by search
  const filtered = enrichedSuites.filter(s => {
    if (!initialSearch) return true;
    const term = initialSearch.toLowerCase();
    return [s.title, s.project, s.planName, s.assignee].some(v => v.toLowerCase().includes(term));
  });

  // Group by status: in-progress runs first, then ready, then completed
  const inProgress = filtered.filter(s => s.lastRun?.status === "in-progress");
  const ready = filtered.filter(s => !s.lastRun || s.lastRun.status !== "in-progress");

  return (
    <PageShell
      icon={<Play size={22} weight="bold" />}
      title="Execution Center"
      description="Start new runs, continue in-progress executions, or review past results."
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Test Sessions" }]}
      actions={<SuitesHeaderActions initialSearch={initialSearch} placeholder="Search suites..." exportModule="test-suites" importModule="test-suites" />}
    >
      <ExecutionSuiteCards inProgress={inProgress} ready={ready} />
    </PageShell>
  );
}


