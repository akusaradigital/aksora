import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";
import { logActivity } from "@/lib/data-helpers";

// GET /api/execution-runs/[id] - get run details + verdicts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const company = user.company || "";
  const isAdmin = user.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND r."company" = ?';
  const companyParams = isAdmin ? [] : [company];

  const run = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun" r
     WHERE r."id" = CAST(? AS INTEGER) AND r."deletedAt" IS NULL${companyFilter}`,
    [id, ...companyParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // Get verdicts with case details
  const verdicts = await db.query<Record<string, unknown>>(
    `SELECT v."id" as "verdictId", v."testCaseId", v."verdict", v."actualResult", v."evidence", v."duration", v."executedAt",
            tc."tcId", tc."caseName", tc."preCondition", tc."testStep", tc."expectedResult", tc."priority", tc."typeCase"
     FROM "CaseVerdict" v
     JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER)
     ORDER BY tc."id" ASC`,
    [id]
  );

  return NextResponse.json({ data: { run, verdicts } });
}

// PATCH /api/execution-runs/[id] - update run (finish, update notes, etc.)
export async function PATCH(
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
  const body = await request.json();

  // Check run exists
  const run = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExecutionRun"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}`,
    [id, ...companyParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // If finishing the run
  if (body.status === "completed") {
    // Count verdicts
    const counts = await db.get<{ passed: number; failed: number; blocked: number }>(
      `SELECT
        SUM(CASE WHEN "verdict" = 'Passed' THEN 1 ELSE 0 END) as "passed",
        SUM(CASE WHEN "verdict" = 'Failed' THEN 1 ELSE 0 END) as "failed",
        SUM(CASE WHEN "verdict" = 'Blocked' THEN 1 ELSE 0 END) as "blocked"
       FROM "CaseVerdict"
       WHERE "executionRunId" = CAST(? AS INTEGER)`,
      [id]
    );

    const passed = Number(counts?.passed) || 0;
    const failed = Number(counts?.failed) || 0;
    const blocked = Number(counts?.blocked) || 0;

    await db.run(
      `UPDATE "ExecutionRun"
       SET "status" = 'completed', "passed" = ?, "failed" = ?, "blocked" = ?,
           "notes" = COALESCE(?, "notes"), "tester" = COALESCE(?, "tester"),
           "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
      [passed, failed, blocked, body.notes ?? null, body.tester ?? null, id, ...companyParams]
    );

    await logActivity(company, "ExecutionRun", id, "Completed", `Run #${run.runNumber} completed - ${passed}P/${failed}F/${blocked}B`, user.name || user.email || "");

    return NextResponse.json({ data: { passed, failed, blocked, status: "completed" } });
  }

  // If abandoning
  if (body.status === "abandoned") {
    await db.run(
      `UPDATE "ExecutionRun"
       SET "status" = 'abandoned', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
      [id, ...companyParams]
    );
    return NextResponse.json({ data: { status: "abandoned" } });
  }

  // Generic update (notes, tester)
  if (body.notes !== undefined || body.tester !== undefined) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.notes !== undefined) { sets.push('"notes" = ?'); vals.push(body.notes); }
    if (body.tester !== undefined) { sets.push('"tester" = ?'); vals.push(body.tester); }
    sets.push('"updatedAt" = CURRENT_TIMESTAMP');

    await db.run(
      `UPDATE "ExecutionRun" SET ${sets.join(", ")} WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
      [...vals, id, ...companyParams]
    );
  }

  return NextResponse.json({ data: { success: true } });
}
