import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";
import { getTestSuiteByToken } from "@/lib/data";
import { notFound } from "next/navigation";
import { RunExecutionView } from "./run-execution-view";
import { RunSummaryPage } from "./run-summary-page";

export const dynamic = "force-dynamic";

export default async function RunExecutionPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: token, runId } = await params;
  const suite = await getTestSuiteByToken(token) as Record<string, unknown> | null;
  if (!suite) notFound();

  const user = await getCurrentUser();
  const company = user?.company || "";
  const isAdmin = user?.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const companyParams = isAdmin ? [] : [company];

  // Get the run
  const run = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}`,
    [runId, ...companyParams]
  );

  if (!run) notFound();

  // Get verdicts with case details
  const verdicts = await db.query<Record<string, unknown>>(
    `SELECT v."id" as "verdictId", v."testCaseId", v."verdict", v."actualResult", v."evidence", v."duration", v."executedAt",
            tc."tcId", tc."caseName", tc."preCondition", tc."testStep", tc."expectedResult", tc."priority", tc."typeCase"
     FROM "CaseVerdict" v
     JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER)
     ORDER BY tc."id" ASC`,
    [runId]
  );

  // Get plan info
  let project = "";
  let sprint = "";
  if (suite.testPlanId) {
    const plan = await db.get<Record<string, unknown>>(
      `SELECT "project", "sprint" FROM "TestPlan" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL`,
      [suite.testPlanId]
    );
    project = String(plan?.project || "");
    sprint = String(plan?.sprint || "");
  }

  const runData = {
    id: Number(run.id),
    runNumber: Number(run.runNumber),
    status: String(run.status),
    tester: String(run.tester || user?.name || user?.email || ""),
    totalCases: Number(run.totalCases) || 0,
    passed: Number(run.passed) || 0,
    failed: Number(run.failed) || 0,
    blocked: Number(run.blocked) || 0,
    notes: String(run.notes || ""),
    startedAt: String(run.startedAt || ""),
  };

  const suiteData = {
    title: String(suite.title),
    publicToken: String(suite.publicToken),
    project,
    sprint,
  };

  const casesData = verdicts.map(v => ({
    verdictId: Number(v.verdictId),
    testCaseId: Number(v.testCaseId),
    tcId: String(v.tcId || ""),
    caseName: String(v.caseName || ""),
    preCondition: String(v.preCondition || ""),
    testStep: String(v.testStep || ""),
    expectedResult: String(v.expectedResult || ""),
    actualResult: String(v.actualResult || ""),
    verdict: String(v.verdict || "Pending"),
    evidence: String(v.evidence || ""),
    duration: Number(v.duration) || 0,
    priority: String(v.priority || "Medium"),
    typeCase: String(v.typeCase || ""),
  }));

  // If run is completed, show summary view
  if (runData.status === "completed") {
    return (
      <RunSummaryPage
        run={runData}
        suite={suiteData}
      />
    );
  }

  return (
    <RunExecutionView
      run={runData}
      suite={suiteData}
      cases={casesData}
    />
  );
}
