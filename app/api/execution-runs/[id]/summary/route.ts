import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";

// GET /api/execution-runs/[id]/summary - get run summary with comparison to previous run
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const company = user.company || "";
  const isAdmin = user.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const companyParams = isAdmin ? [] : [company];

  // Get current run
  const run = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}`,
    [id, ...companyParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // Get verdicts for current run
  const verdicts = await db.query<Record<string, unknown>>(
    `SELECT v."testCaseId", v."verdict", v."actualResult", v."duration",
            tc."tcId", tc."caseName", tc."priority"
     FROM "CaseVerdict" v
     JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER)
     ORDER BY tc."id" ASC`,
    [id]
  );

  // Get previous run for comparison
  const prevRun = await db.get<Record<string, unknown>>(
    `SELECT "id" FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER)
       AND "runNumber" < CAST(? AS INTEGER)
       AND "status" = 'completed'
       AND "deletedAt" IS NULL${companyFilter}
     ORDER BY "runNumber" DESC LIMIT 1`,
    [run.testSuiteId, run.runNumber, ...companyParams]
  );

  const prevVerdicts: Record<number, string> = {};
  if (prevRun) {
    const pv = await db.query<{ testCaseId: number; verdict: string }>(
      `SELECT "testCaseId", "verdict" FROM "CaseVerdict"
       WHERE "executionRunId" = CAST(? AS INTEGER)`,
      [prevRun.id]
    );
    for (const v of pv) {
      prevVerdicts[Number(v.testCaseId)] = v.verdict;
    }
  }

  // Build comparison data
  const cases = verdicts.map(v => {
    const tcId = Number(v.testCaseId);
    const prevVerdict = prevVerdicts[tcId] || null;
    const currentVerdict = String(v.verdict);
    let change: "improved" | "regressed" | "same" | "new" = "same";

    if (!prevVerdict) {
      change = "new";
    } else if (prevVerdict !== currentVerdict) {
      if (currentVerdict === "Passed" && prevVerdict !== "Passed") change = "improved";
      else if (currentVerdict !== "Passed" && prevVerdict === "Passed") change = "regressed";
      else change = "same";
    }

    return {
      testCaseId: tcId,
      tcId: String(v.tcId),
      caseName: String(v.caseName),
      priority: String(v.priority),
      verdict: currentVerdict,
      actualResult: String(v.actualResult || ""),
      duration: Number(v.duration) || 0,
      prevVerdict,
      change,
    };
  });

  const passed = cases.filter(c => c.verdict === "Passed").length;
  const failed = cases.filter(c => c.verdict === "Failed").length;
  const blocked = cases.filter(c => c.verdict === "Blocked").length;
  const pending = cases.filter(c => c.verdict === "Pending").length;
  const total = cases.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const totalDuration = cases.reduce((sum, c) => sum + c.duration, 0);

  const regressions = cases.filter(c => c.change === "regressed");
  const improvements = cases.filter(c => c.change === "improved");
  const failedCases = cases.filter(c => c.verdict === "Failed");
  const blockedCases = cases.filter(c => c.verdict === "Blocked");

  return NextResponse.json({
    data: {
      run: {
        id: Number(run.id),
        runNumber: Number(run.runNumber),
        tester: String(run.tester || ""),
        startedAt: String(run.startedAt || ""),
        completedAt: run.completedAt ? String(run.completedAt) : null,
        notes: String(run.notes || ""),
      },
      stats: { total, passed, failed, blocked, pending, passRate, totalDuration },
      cases,
      failedCases,
      blockedCases,
      regressions,
      improvements,
      hasPreviousRun: !!prevRun,
    },
  });
}
