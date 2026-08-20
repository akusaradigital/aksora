import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity, getAccessScope } from "@/lib/data-helpers";

// GET /api/execution-runs?suiteId=123 - list runs for a suite
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, andWhere, params: qParams } = getAccessScope(user);
  const suiteId = request.nextUrl.searchParams.get("suiteId");

  if (!suiteId) {
    return NextResponse.json({ error: "suiteId is required" }, { status: 400 });
  }

  const runs = await db.query<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}
     ORDER BY "runNumber" DESC`,
    [suiteId, ...qParams]
  );

  return NextResponse.json({ data: runs });
}

// POST /api/execution-runs - create a new run for a suite
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);
  const body = await request.json();
  const { testSuiteId, testPlanId = "" } = body;

  if (!testSuiteId) {
    return NextResponse.json({ error: "testSuiteId is required" }, { status: 400 });
  }

  const lastRun = await db.get<{ maxNum: number | null }>(
    `SELECT MAX("runNumber") as "maxNum" FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [testSuiteId, ...qParams]
  );
  const runNumber = (Number(lastRun?.maxNum) || 0) + 1;

  const caseCount = await db.get<{ cnt: number }>(
    `SELECT COUNT(*) as "cnt" FROM "TestCase"
     WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL${andWhere}`,
    [String(testSuiteId), ...qParams]
  );
  const totalCases = Number(caseCount?.cnt) || 0;

  await db.run(
    `INSERT INTO "ExecutionRun" ("company", "workspaceId", "testSuiteId", "testPlanId", "runNumber", "status", "tester", "totalCases", "startedAt")
     VALUES (?, ?, CAST(? AS INTEGER), ?, ?, 'in-progress', ?, ?, CURRENT_TIMESTAMP)`,
    [company, workspaceId, testSuiteId, testPlanId, runNumber, user.name || user.email || "", totalCases]
  );

  const run = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "runNumber" = ? AND "deletedAt" IS NULL${andWhere}
     ORDER BY "id" DESC LIMIT 1`,
    [testSuiteId, runNumber, ...qParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }

  // Create initial CaseVerdict rows for all cases in the suite — one multi-row
  // INSERT instead of one query per case (was N+1, ~2 round-trips per case).
  const cases = await db.query<{ id: number }>(
    `SELECT "id" FROM "TestCase"
     WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL${andWhere}
     ORDER BY "id" ASC`,
    [String(testSuiteId), ...qParams]
  );

  const CHUNK = 100;
  for (let i = 0; i < cases.length; i += CHUNK) {
    const chunk = cases.slice(i, i + CHUNK);
    const values = chunk.map(() => "(?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), 'Pending')").join(", ");
    const params: unknown[] = [];
    for (const tc of chunk) params.push(company, workspaceId, run.id, tc.id);
    await db.run(
      `INSERT INTO "CaseVerdict" ("company", "workspaceId", "executionRunId", "testCaseId", "verdict")
       VALUES ${values}`,
      params
    );
  }

  await logActivity(company, "ExecutionRun", String(run.id), "Created", `Run #${runNumber} started`, user.name || user.email || "", undefined, workspaceId);

  return NextResponse.json({ data: run });
}
