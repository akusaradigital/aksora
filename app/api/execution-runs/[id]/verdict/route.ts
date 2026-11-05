import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { recordVerdict, type Verdict } from "@/lib/run-verdicts";

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

    const existing = await db.get<{ id: number; matrix?: string }>(
      `SELECT "id", "matrix" FROM "CaseVerdict"
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

    await recordVerdict({
      runId,
      testCaseId: String(testCaseId),
      verdict: effectiveVerdict as Verdict,
      company,
      workspaceId,
      actualResult,
      evidence,
      duration,
      matrix: updatedMatrixStr,
      aiAnalysis: aiAnalysisStr,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Execution verdict PATCH error:", error);
    const msg = error instanceof Error ? error.message : "Failed to record verdict.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
