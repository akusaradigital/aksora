import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-core";

// PATCH /api/execution-runs/[id]/verdict - auto-save a single verdict
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: runId } = await params;
  const company = user.company || "";
  const isAdmin = user.role === "admin" && !company;
  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const companyParams = isAdmin ? [] : [company];
  const body = await request.json();

  const { testCaseId, verdict, actualResult, evidence, duration } = body;

  if (!testCaseId || !verdict) {
    return NextResponse.json({ error: "testCaseId and verdict are required" }, { status: 400 });
  }

  if (!["Pending", "Passed", "Failed", "Blocked"].includes(verdict)) {
    return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
  }

  // Verify run exists and is in-progress
  const run = await db.get<{ status: string }>(
    `SELECT "status" FROM "ExecutionRun"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${companyFilter}`,
    [runId, ...companyParams]
  );

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.status !== "in-progress") {
    return NextResponse.json({ error: "Run is not in progress" }, { status: 400 });
  }

  // Upsert verdict
  const existing = await db.get<{ id: number }>(
    `SELECT "id" FROM "CaseVerdict"
     WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
    [runId, testCaseId]
  );

  if (existing) {
    const sets: string[] = ['"verdict" = ?', '"updatedAt" = CURRENT_TIMESTAMP'];
    const vals: unknown[] = [verdict];

    if (actualResult !== undefined) { sets.push('"actualResult" = ?'); vals.push(actualResult); }
    if (evidence !== undefined) { sets.push('"evidence" = ?'); vals.push(evidence); }
    if (duration !== undefined) { sets.push('"duration" = ?'); vals.push(duration); }
    if (verdict !== "Pending") { sets.push('"executedAt" = CURRENT_TIMESTAMP'); }

    await db.run(
      `UPDATE "CaseVerdict" SET ${sets.join(", ")}
       WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
      [...vals, runId, testCaseId]
    );
  } else {
    await db.run(
      `INSERT INTO "CaseVerdict" ("company", "executionRunId", "testCaseId", "verdict", "actualResult", "evidence", "duration", "executedAt")
       VALUES (?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?, ?, ${verdict !== "Pending" ? "CURRENT_TIMESTAMP" : "NULL"})`,
      [company, runId, testCaseId, verdict, actualResult || "", evidence || "", duration || 0]
    );
  }

  // Update run counts
  const counts = await db.get<{ passed: number; failed: number; blocked: number }>(
    `SELECT
      SUM(CASE WHEN "verdict" = 'Passed' THEN 1 ELSE 0 END) as "passed",
      SUM(CASE WHEN "verdict" = 'Failed' THEN 1 ELSE 0 END) as "failed",
      SUM(CASE WHEN "verdict" = 'Blocked' THEN 1 ELSE 0 END) as "blocked"
     FROM "CaseVerdict"
     WHERE "executionRunId" = CAST(? AS INTEGER)`,
    [runId]
  );

  await db.run(
    `UPDATE "ExecutionRun"
     SET "passed" = ?, "failed" = ?, "blocked" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [Number(counts?.passed) || 0, Number(counts?.failed) || 0, Number(counts?.blocked) || 0, runId]
  );

  return NextResponse.json({ data: { success: true } });
}
