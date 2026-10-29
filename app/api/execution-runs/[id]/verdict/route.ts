import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

// PATCH /api/execution-runs/[id]/verdict - auto-save a single verdict
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: runId } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const { testCaseId, verdict, actualResult, evidence, duration, viewport, matrix, aiAnalysis } = body;

  if (!testCaseId || !verdict) {
    return NextResponse.json({ error: "testCaseId and verdict are required" }, { status: 400 });
  }

  if (!["Pending", "Passed", "Failed", "Blocked"].includes(String(verdict))) {
    return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
  }

  try {
    // Verify run exists and is in-progress
    const run = await db.get<{ status: string }>(
      `SELECT "status" FROM "ExecutionRun"
       WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
      [runId, ...qParams]
    );

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status !== "in-progress") {
      return NextResponse.json({ error: "Run is not in progress" }, { status: 400 });
    }

    // Upsert verdict
    const existing = await db.get<{ id: number; matrix?: string; aiAnalysis?: string }>(
      `SELECT "id", "matrix", "aiAnalysis" FROM "CaseVerdict"
       WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
      [runId, testCaseId]
    );

    // Compute updated matrix if viewport or matrix is specified
    let updatedMatrixStr: string | undefined = undefined;
    let effectiveVerdict = String(verdict);

    if (viewport && typeof viewport === "string") {
      let matrixMap: Record<string, { verdict: string; actualResult?: unknown; evidence?: unknown }> = {};
      try {
        if (existing?.matrix) matrixMap = JSON.parse(existing.matrix);
      } catch {
        matrixMap = {};
      }
      matrixMap[viewport] = {
        verdict: String(verdict),
        actualResult: actualResult !== undefined ? actualResult : matrixMap[viewport]?.actualResult,
        evidence: evidence !== undefined ? evidence : matrixMap[viewport]?.evidence,
      };
      updatedMatrixStr = JSON.stringify(matrixMap);

      // Derive aggregate verdict: if any viewport failed -> Failed; if any blocked -> Blocked; if all passed -> Passed
      const values = Object.values(matrixMap).map((m) => m.verdict);
      if (values.includes("Failed")) {
        effectiveVerdict = "Failed";
      } else if (values.includes("Blocked")) {
        effectiveVerdict = "Blocked";
      } else if (values.length > 0 && values.every((v) => v === "Passed")) {
        effectiveVerdict = "Passed";
      }
    } else if (matrix && typeof matrix === "object") {
      updatedMatrixStr = JSON.stringify(matrix);
    }

    const aiAnalysisStr = aiAnalysis ? (typeof aiAnalysis === "string" ? aiAnalysis : JSON.stringify(aiAnalysis)) : undefined;

    if (existing) {
      const sets: string[] = ['"verdict" = ?', '"updatedAt" = CURRENT_TIMESTAMP'];
      const vals: unknown[] = [effectiveVerdict];

      if (actualResult !== undefined) { sets.push('"actualResult" = ?'); vals.push(actualResult); }
      if (evidence !== undefined) { sets.push('"evidence" = ?'); vals.push(evidence); }
      if (duration !== undefined) { sets.push('"duration" = ?'); vals.push(duration); }
      if (updatedMatrixStr !== undefined) { sets.push('"matrix" = ?'); vals.push(updatedMatrixStr); }
      if (aiAnalysisStr !== undefined) { sets.push('"aiAnalysis" = ?'); vals.push(aiAnalysisStr); }
      if (effectiveVerdict !== "Pending") { sets.push('"executedAt" = CURRENT_TIMESTAMP'); }

      await db.run(
        `UPDATE "CaseVerdict" SET ${sets.join(", ")}
         WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
        [...vals, runId, testCaseId]
      );
    } else {
      await db.run(
        `INSERT INTO "CaseVerdict" ("company", "workspaceId", "executionRunId", "testCaseId", "verdict", "actualResult", "evidence", "duration", "matrix", "aiAnalysis", "executedAt")
         VALUES (?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?, ?, ?, ?, ${effectiveVerdict !== "Pending" ? "CURRENT_TIMESTAMP" : "NULL"})`,
        [company, workspaceId, runId, testCaseId, effectiveVerdict, actualResult || "", evidence || "", duration || 0, updatedMatrixStr || "", aiAnalysisStr || ""]
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
  } catch (error) {
    console.error("Execution verdict PATCH error:", error);
    const msg = error instanceof Error ? error.message : "Failed to record verdict.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
