import { NextResponse } from "next/server";
import { getDashboardData, getBugSeverityCounts, getTestPassRate, computeQualityHealthScore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { logger } from "@/lib/logger";

function emptyDashboardData() {
  return {
    metrics: [
      { label: "Open Tasks", value: 0, caption: "Daily QA tasks currently being managed." },
      { label: "Bug Entries", value: 0, caption: "Defects with severity, priority, and evidence." },
      { label: "Test Cases", value: 0, caption: "Positive and negative scenarios ready for use." },
    ],
    distribution: {
      tasks: [],
      bugs: [],
      bugByModule: [],
    },
    todayActivity: [],
    personalSuccessRate: 0,
    recent: {
      tasks: [],
      bugs: [],
      testCases: [],
    },
    sprintInfo: null,
    bugTrendData: [],
    sprintBurndown: [],
    sprintPassRates: [],
    sprints: [],
    activity: [],
    resolutionRate: {
      current: null,
      previousWeek: null,
      delta: null,
    },
    spotlight: {
       projectName: "No active project",
       projectDescription: "Track and monitor QA progress across modules.",
       totalScenarios: 0,
       totalBugs: 0,
       completionRate: 0,
       criticalBugs: [],
       priorityTasks: []
    }
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(emptyDashboardData(), { status: 401 });

  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project") || "";

  try {
    const timeoutMs = 2500;
    let timedOut = false;
    const data = await Promise.race([
      getDashboardData(project),
      new Promise<any>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          resolve(emptyDashboardData());
        }, timeoutMs);
      }),
    ]);
    if (timedOut) {
      return NextResponse.json(data, {
        headers: { "X-Dashboard-Timeout": "true" },
      });
    }

    // Graceful fallback: if severity counts query fails, omit from response
    let bugSeverityCounts: { critical: number; high: number; medium: number; low: number } | null = null;
    try {
      const { company, isAdmin } = getAccessScope(user);
      bugSeverityCounts = await getBugSeverityCounts(company, isAdmin);
      (data as any).bugSeverityCounts = bugSeverityCounts;
    } catch {
      // Omit bugSeverityCounts from response without error
    }

    // Quality Health Score computation
    try {
      const { company, isAdmin } = getAccessScope(user);

      // Get resolution rate from the data already computed
      const resolutionRateValue: number | null = (data as any).resolutionRate?.current ?? null;

      // Compute inverse critical ratio from bug severity counts
      // When totalOpen is 0 (no bugs at all), treat as null (no data) instead of 100
      let inverseCriticalRatio: number | null = null;
      if (bugSeverityCounts) {
        const totalOpen = bugSeverityCounts.critical + bugSeverityCounts.high + bugSeverityCounts.medium + bugSeverityCounts.low;
        if (totalOpen > 0) {
          inverseCriticalRatio = (1 - bugSeverityCounts.critical / totalOpen) * 100;
        }
      }

      // Get test pass rate
      const testPassRate = await getTestPassRate(company, isAdmin);

      // Only compute and include health score when at least one component has data
      const hasAnyData = resolutionRateValue !== null || inverseCriticalRatio !== null || testPassRate !== null;

      if (hasAnyData) {
        const score = computeQualityHealthScore(resolutionRateValue, inverseCriticalRatio, testPassRate);

        (data as any).qualityHealthScore = {
          score,
          components: {
            resolutionRate: resolutionRateValue,
            inverseCriticalRatio: inverseCriticalRatio,
            testPassRate: testPassRate,
          },
        };
      }
    } catch {
      // Omit qualityHealthScore from response without error
    }

    // Include user role for client-side role-based UI decisions
    (data as any).userRole = user.role;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
      },
    });
  } catch (error) {
    logger.apiError("/api/dashboard", error, { company: user.company, userId: user.id });
    return NextResponse.json(emptyDashboardData(), {
      status: 200,
      headers: { "X-Dashboard-Error": "true" },
    });
  }
}
