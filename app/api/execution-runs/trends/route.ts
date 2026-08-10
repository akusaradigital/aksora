import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";

// GET /api/execution-runs/trends?suiteId=123 - pass rate trend for a suite
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = user.company || "";
  const isAdmin = user.role === "admin" && !company;
  const suiteId = request.nextUrl.searchParams.get("suiteId");

  if (!suiteId) {
    return NextResponse.json({ error: "suiteId is required" }, { status: 400 });
  }

  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const companyParams = isAdmin ? [] : [company];

  const runs = await db.query<Record<string, unknown>>(
    `SELECT "runNumber", "passed", "failed", "blocked", "totalCases", "tester", "startedAt", "completedAt"
     FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER)
       AND "status" = 'completed'
       AND "deletedAt" IS NULL${companyFilter}
     ORDER BY "runNumber" ASC
     LIMIT 20`,
    [suiteId, ...companyParams]
  );

  const trend = runs.map(r => {
    const total = Number(r.totalCases) || 1;
    const passed = Number(r.passed) || 0;
    return {
      runNumber: Number(r.runNumber),
      passRate: Math.round((passed / total) * 100),
      passed,
      failed: Number(r.failed) || 0,
      blocked: Number(r.blocked) || 0,
      total,
      tester: String(r.tester || ""),
      date: r.completedAt ? String(r.completedAt) : String(r.startedAt || ""),
    };
  });

  return NextResponse.json({ data: trend });
}
