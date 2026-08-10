import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

export type CoverageStats = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  coverageRate: number;
  passRate: number;
};

export type ProjectCoverage = {
  project: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  coverageRate: number;
  passRate: number;
};

export type SuiteCoverage = {
  project: string;
  suiteTitle: string;
  suiteId: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  coverageRate: number;
  passRate: number;
};

export type TrendPoint = {
  period: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
};

export type CoverageAlert = {
  id: string;
  level: "critical" | "warning" | "info";
  project: string;
  message: string;
  detail: string;
  metric: string;
  value: number;
  previousValue?: number;
};

export type CoverageData = {
  stats: CoverageStats;
  byProject: ProjectCoverage[];
  bySuite: SuiteCoverage[];
  trend: TrendPoint[];
  alerts: CoverageAlert[];
};

type CoverageRow = {
  project: string;
  suiteTitle: string;
  suiteId: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
};

type TrendRow = {
  period: string;
  total: number;
  passed: number;
  failed: number;
};

function generateCoverageAlerts(
  byProject: ProjectCoverage[],
  trendRows: TrendRow[],
): CoverageAlert[] {
  const alerts: CoverageAlert[] = [];
  const CRITICAL_THRESHOLD = 50;
  const WARNING_THRESHOLD = 70;
  const DROP_THRESHOLD = 10;

  for (const proj of byProject) {
    if (proj.total === 0) continue;

    if (proj.passRate < CRITICAL_THRESHOLD) {
      alerts.push({
        id: `low-pass-${proj.project}`,
        level: "critical",
        project: proj.project,
        message: `Critical: Pass rate below ${CRITICAL_THRESHOLD}%`,
        detail: `${proj.project} has only ${proj.passRate}% pass rate (${proj.passed}/${proj.total} cases passed)`,
        metric: "passRate",
        value: proj.passRate,
      });
    } else if (proj.passRate < WARNING_THRESHOLD) {
      alerts.push({
        id: `warn-pass-${proj.project}`,
        level: "warning",
        project: proj.project,
        message: `Warning: Pass rate below ${WARNING_THRESHOLD}%`,
        detail: `${proj.project} has ${proj.passRate}% pass rate — consider reviewing failing tests`,
        metric: "passRate",
        value: proj.passRate,
      });
    }

    const pendingRate = Math.round((proj.pending / proj.total) * 100);
    if (pendingRate > 50) {
      alerts.push({
        id: `pending-${proj.project}`,
        level: "warning",
        project: proj.project,
        message: `${pendingRate}% of test cases not yet executed`,
        detail: `${proj.project} has ${proj.pending} pending cases out of ${proj.total} total`,
        metric: "pendingRate",
        value: pendingRate,
      });
    }
  }

  const reversedTrend = [...trendRows].reverse();
  if (reversedTrend.length >= 3) {
    const recent = reversedTrend.slice(0, 2);
    const previous = reversedTrend.slice(2, 5);

    if (recent.length > 0 && previous.length > 0) {
      const recentAvgPassRate = recent.reduce((sum, r) => {
        const total = Number(r.total);
        const passed = Number(r.passed);
        return sum + (total > 0 ? (passed / total) * 100 : 0);
      }, 0) / recent.length;

      const previousAvgPassRate = previous.reduce((sum, r) => {
        const total = Number(r.total);
        const passed = Number(r.passed);
        return sum + (total > 0 ? (passed / total) * 100 : 0);
      }, 0) / previous.length;

      const drop = Math.round(previousAvgPassRate - recentAvgPassRate);
      if (drop >= DROP_THRESHOLD) {
        alerts.push({
          id: "trend-drop",
          level: drop >= 20 ? "critical" : "warning",
          project: "All",
          message: `Pass rate dropped ${drop}% compared to previous period`,
          detail: `Recent average: ${Math.round(recentAvgPassRate)}% vs previous: ${Math.round(previousAvgPassRate)}%`,
          metric: "trendDrop",
          value: Math.round(recentAvgPassRate),
          previousValue: Math.round(previousAvgPassRate),
        });
      }
    }
  }

  const levelOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  return alerts;
}

/**
 * Server-side data fetching for test coverage report.
 * Returns null if user is not authenticated.
 */
export async function getTestCoverageData(): Promise<CoverageData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { isAdmin, params } = getAccessScope(user);

  try {
    const companyFilter = isAdmin ? "" : 'AND tc."company" = ?';
    const coverageQuery = `
      SELECT 
        COALESCE(tp."project", 'Unlinked') as "project",
        COALESCE(ts."title", 'No Suite') as "suiteTitle",
        CAST(ts."id" AS TEXT) as "suiteId",
        COUNT(*) as "total",
        SUM(CASE WHEN tc."status" = 'Passed' THEN 1 ELSE 0 END) as "passed",
        SUM(CASE WHEN tc."status" = 'Failed' THEN 1 ELSE 0 END) as "failed",
        SUM(CASE WHEN tc."status" = 'Blocked' THEN 1 ELSE 0 END) as "blocked",
        SUM(CASE WHEN tc."status" = 'Pending' THEN 1 ELSE 0 END) as "pending"
      FROM "TestCase" tc
      LEFT JOIN "TestSuite" ts ON CAST(tc."testSuiteId" AS TEXT) = CAST(ts."id" AS TEXT) AND ts."deletedAt" IS NULL
      LEFT JOIN "TestPlan" tp ON CAST(ts."testPlanId" AS TEXT) = CAST(tp."id" AS TEXT) AND tp."deletedAt" IS NULL
      WHERE tc."deletedAt" IS NULL ${companyFilter}
      GROUP BY COALESCE(tp."project", 'Unlinked'), COALESCE(ts."title", 'No Suite'), CAST(ts."id" AS TEXT)
      ORDER BY "project", "suiteTitle"
    `;

    const coverageRows = await db.query<CoverageRow>(coverageQuery, params);

    const statsQuery = `
      SELECT 
        COUNT(*) as "total",
        SUM(CASE WHEN "status" = 'Passed' THEN 1 ELSE 0 END) as "passed",
        SUM(CASE WHEN "status" = 'Failed' THEN 1 ELSE 0 END) as "failed",
        SUM(CASE WHEN "status" = 'Blocked' THEN 1 ELSE 0 END) as "blocked",
        SUM(CASE WHEN "status" = 'Pending' THEN 1 ELSE 0 END) as "pending"
      FROM "TestCase"
      WHERE "deletedAt" IS NULL ${isAdmin ? "" : 'AND "company" = ?'}
    `;

    const statsRows = await db.query<{ total: number; passed: number; failed: number; blocked: number; pending: number }>(statsQuery, params);
    const rawStats = statsRows[0] || { total: 0, passed: 0, failed: 0, blocked: 0, pending: 0 };

    const trendCompanyFilter = isAdmin ? "" : 'WHERE er."company" = ?';
    const trendQuery = `
        SELECT 
          TO_CHAR(er."startedAt", 'YYYY-MM-DD') as "period",
          SUM(er."totalCases") as "total",
          SUM(er."passed") as "passed",
          SUM(er."failed") as "failed"
        FROM "ExecutionRun" er
        ${trendCompanyFilter}
        GROUP BY TO_CHAR(er."startedAt", 'YYYY-MM-DD')
        ORDER BY "period" DESC
        LIMIT 30
      `;

    const trendRows = await db.query<TrendRow>(trendQuery, params);

    const projectCoverage = new Map<string, { total: number; passed: number; failed: number; blocked: number; pending: number }>();
    for (const row of coverageRows) {
      const existing = projectCoverage.get(row.project) || { total: 0, passed: 0, failed: 0, blocked: 0, pending: 0 };
      existing.total += Number(row.total);
      existing.passed += Number(row.passed);
      existing.failed += Number(row.failed);
      existing.blocked += Number(row.blocked);
      existing.pending += Number(row.pending);
      projectCoverage.set(row.project, existing);
    }

    const byProject = Array.from(projectCoverage.entries()).map(([project, data]) => ({
      project,
      ...data,
      coverageRate: data.total > 0 ? Math.round(((data.passed + data.failed) / data.total) * 100) : 0,
      passRate: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0,
    }));

    const bySuite = coverageRows.map((row) => ({
      ...row,
      total: Number(row.total),
      passed: Number(row.passed),
      failed: Number(row.failed),
      blocked: Number(row.blocked),
      pending: Number(row.pending),
      coverageRate: Number(row.total) > 0 ? Math.round(((Number(row.passed) + Number(row.failed)) / Number(row.total)) * 100) : 0,
      passRate: Number(row.total) > 0 ? Math.round((Number(row.passed) / Number(row.total)) * 100) : 0,
    }));

    const stats: CoverageStats = {
      total: Number(rawStats.total),
      passed: Number(rawStats.passed),
      failed: Number(rawStats.failed),
      blocked: Number(rawStats.blocked),
      pending: Number(rawStats.pending),
      coverageRate: Number(rawStats.total) > 0 ? Math.round(((Number(rawStats.passed) + Number(rawStats.failed)) / Number(rawStats.total)) * 100) : 0,
      passRate: Number(rawStats.total) > 0 ? Math.round((Number(rawStats.passed) / Number(rawStats.total)) * 100) : 0,
    };

    const trend: TrendPoint[] = trendRows.reverse().map((row) => ({
      period: row.period,
      total: Number(row.total),
      passed: Number(row.passed),
      failed: Number(row.failed),
      passRate: Number(row.total) > 0 ? Math.round((Number(row.passed) / Number(row.total)) * 100) : 0,
    }));

    return {
      stats,
      byProject,
      bySuite,
      trend,
      alerts: generateCoverageAlerts(byProject, trendRows),
    };
  } catch (error) {
    console.error("Test coverage data error:", error);
    return null;
  }
}
