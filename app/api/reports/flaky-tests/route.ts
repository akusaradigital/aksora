import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

type FlakyRow = {
  testCaseId: number;
  tcId: string;
  caseName: string;
  suiteTitle: string;
  project: string;
  totalRuns: number;
  passCount: number;
  failCount: number;
  blockedCount: number;
  flakinessRate: number;
  lastVerdict: string;
  lastRunAt: string;
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company: _company, isAdmin, params } = getAccessScope(user);
  const threshold = Number(request.nextUrl.searchParams.get("threshold") ?? 20);
  const minRuns = Number(request.nextUrl.searchParams.get("minRuns") ?? 3);

  try {
    const companyFilter = isAdmin ? "" : 'AND cv."company" = ?';

    // Find test cases with inconsistent results across execution runs
    const flakyQuery = `
      SELECT 
        cv."testCaseId",
        tc."tcId",
        tc."caseName",
        COALESCE(ts."title", 'No Suite') as "suiteTitle",
        COALESCE(tp."project", 'Unknown') as "project",
        COUNT(*) as "totalRuns",
        SUM(CASE WHEN cv."verdict" = 'Passed' THEN 1 ELSE 0 END) as "passCount",
        SUM(CASE WHEN cv."verdict" = 'Failed' THEN 1 ELSE 0 END) as "failCount",
        SUM(CASE WHEN cv."verdict" = 'Blocked' THEN 1 ELSE 0 END) as "blockedCount"
      FROM "CaseVerdict" cv
      JOIN "TestCase" tc ON cv."testCaseId" = tc."id" AND tc."deletedAt" IS NULL
      LEFT JOIN "TestSuite" ts ON CAST(tc."testSuiteId" AS TEXT) = CAST(ts."id" AS TEXT) AND ts."deletedAt" IS NULL
      LEFT JOIN "TestPlan" tp ON CAST(ts."testPlanId" AS TEXT) = CAST(tp."id" AS TEXT) AND tp."deletedAt" IS NULL
      WHERE cv."verdict" != 'Pending' ${companyFilter}
      GROUP BY cv."testCaseId", tc."tcId", tc."caseName", COALESCE(ts."title", 'No Suite'), COALESCE(tp."project", 'Unknown')
      HAVING COUNT(*) >= ?
      ORDER BY COUNT(*) DESC
    `;

    const queryParams = [...params, minRuns];
    const rows = await db.query<{
      testCaseId: number;
      tcId: string;
      caseName: string;
      suiteTitle: string;
      project: string;
      totalRuns: number | string;
      passCount: number | string;
      failCount: number | string;
      blockedCount: number | string;
    }>(flakyQuery, queryParams);

    // Calculate flakiness rate and filter
    const flakyTests: FlakyRow[] = [];
    for (const row of rows) {
      const totalRuns = Number(row.totalRuns);
      const passCount = Number(row.passCount);
      const failCount = Number(row.failCount);
      const blockedCount = Number(row.blockedCount);

      // Flakiness = percentage of runs that differ from the majority result
      const maxResult = Math.max(passCount, failCount, blockedCount);
      const flakinessRate = totalRuns > 0 ? Math.round(((totalRuns - maxResult) / totalRuns) * 100) : 0;

      if (flakinessRate >= threshold) {
        // Get last verdict for this test case
        const lastVerdictRow = await db.get<{ verdict: string; executedAt: string }>(
          `SELECT "verdict", "executedAt" FROM "CaseVerdict" WHERE "testCaseId" = ? ORDER BY "id" DESC LIMIT 1`,
          [row.testCaseId],
        );

        flakyTests.push({
          testCaseId: Number(row.testCaseId),
          tcId: row.tcId,
          caseName: row.caseName,
          suiteTitle: row.suiteTitle,
          project: row.project,
          totalRuns,
          passCount,
          failCount,
          blockedCount,
          flakinessRate,
          lastVerdict: lastVerdictRow?.verdict ?? "Unknown",
          lastRunAt: lastVerdictRow?.executedAt ?? "",
        });
      }
    }

    // Sort by flakiness rate descending
    flakyTests.sort((a, b) => b.flakinessRate - a.flakinessRate);

    // Summary stats
    const totalTracked = rows.length;
    const totalFlaky = flakyTests.length;
    const avgFlakinessRate = flakyTests.length > 0
      ? Math.round(flakyTests.reduce((sum, t) => sum + t.flakinessRate, 0) / flakyTests.length)
      : 0;

    // Group by project
    const byProject = new Map<string, { count: number; avgRate: number; rates: number[] }>();
    for (const test of flakyTests) {
      const existing = byProject.get(test.project) || { count: 0, avgRate: 0, rates: [] };
      existing.count += 1;
      existing.rates.push(test.flakinessRate);
      byProject.set(test.project, existing);
    }
    const projectBreakdown = Array.from(byProject.entries()).map(([project, data]) => ({
      project,
      count: data.count,
      avgRate: Math.round(data.rates.reduce((s, r) => s + r, 0) / data.rates.length),
    }));

    // Get verdict history for top flaky tests (top 10)
    const topFlaky = flakyTests.slice(0, 10);
    const histories: Record<number, Array<{ verdict: string; executedAt: string; runNumber: number }>> = {};

    for (const test of topFlaky) {
      const historyRows = await db.query<{ verdict: string; executedAt: string; runNumber: number }>(
        `SELECT cv."verdict", cv."executedAt", er."runNumber"
         FROM "CaseVerdict" cv
         JOIN "ExecutionRun" er ON cv."executionRunId" = er."id"
         WHERE cv."testCaseId" = ?
         ORDER BY cv."id" DESC
         LIMIT 20`,
        [test.testCaseId],
      );
      histories[test.testCaseId] = historyRows.reverse();
    }

    return NextResponse.json({
      summary: {
        totalTracked,
        totalFlaky,
        avgFlakinessRate,
        threshold,
        minRuns,
      },
      flakyTests,
      projectBreakdown,
      histories,
    });
  } catch (error) {
    console.error("Flaky tests API error:", error);
    return NextResponse.json({ error: "Failed to load flaky test data" }, { status: 500 });
  }
}
