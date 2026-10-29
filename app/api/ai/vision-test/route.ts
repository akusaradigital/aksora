import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { executeVisionTestRun } from "@/lib/ai-vision-test";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    testCaseId,
    executionRunId,
    imageBase64,
    viewport = "desktop",
    additionalNotes = "",
    ai,
  } = body;

  if (!testCaseId) {
    return NextResponse.json({ error: "testCaseId is required" }, { status: 400 });
  }

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  // Fetch test case from DB
  const testCase = await db.get<{
    id: number;
    tcId: string;
    caseName: string;
    preCondition: string;
    testStep: string;
    expectedResult: string;
    typeCase: string;
    priority: string;
  }>(
    `SELECT "id", "tcId", "caseName", "preCondition", "testStep", "expectedResult", "typeCase", "priority"
     FROM "TestCase"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [testCaseId, ...qParams]
  );

  if (!testCase) {
    return NextResponse.json({ error: "TestCase not found or access denied" }, { status: 404 });
  }

  // Execute Vision Test Analysis
  const result = await executeVisionTestRun({
    testCase,
    imageBase64,
    viewport: String(viewport),
    additionalNotes: String(additionalNotes || ""),
    ai: ai as { provider?: string; model?: string; apiKey?: string; publicUrl?: string } | undefined,
  });

  let saved = false;

  // If tied to an active ExecutionRun, auto-persist to CaseVerdict!
  if (executionRunId) {
    const run = await db.get<{ id: number; status: string }>(
      `SELECT "id", "status" FROM "ExecutionRun"
       WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
      [executionRunId, ...qParams]
    );

    if (run && run.status === "in-progress") {
      const existing = await db.get<{ id: number; matrix?: string }>(
        `SELECT "id", "matrix" FROM "CaseVerdict"
         WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
        [executionRunId, testCaseId]
      );

      // Merge into viewport matrix
      let matrixMap: Record<string, unknown> = {};
      try {
        if (existing?.matrix) matrixMap = JSON.parse(existing.matrix);
      } catch {
        matrixMap = {};
      }
      matrixMap[String(viewport)] = {
        verdict: result.verdict,
        actualResult: result.actualResult,
        confidence: result.confidence,
        evidence: imageBase64,
      };

      const matrixStr = JSON.stringify(matrixMap);
      const aiAnalysisStr = JSON.stringify(result);

      if (existing) {
        await db.run(
          `UPDATE "CaseVerdict"
           SET "verdict" = ?, "actualResult" = ?, "evidence" = ?, "matrix" = ?, "aiAnalysis" = ?,
               "executedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
          [result.verdict, result.actualResult, imageBase64, matrixStr, aiAnalysisStr, executionRunId, testCaseId]
        );
      } else {
        await db.run(
          `INSERT INTO "CaseVerdict" (
            "company", "workspaceId", "executionRunId", "testCaseId", "verdict",
            "actualResult", "evidence", "matrix", "aiAnalysis", "executedAt"
          ) VALUES (?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [company, workspaceId, executionRunId, testCaseId, result.verdict, result.actualResult, imageBase64, matrixStr, aiAnalysisStr]
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
        [executionRunId]
      );

      await db.run(
        `UPDATE "ExecutionRun"
         SET "passed" = ?, "failed" = ?, "blocked" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = CAST(? AS INTEGER)`,
        [Number(counts?.passed) || 0, Number(counts?.failed) || 0, Number(counts?.blocked) || 0, executionRunId]
      );

      saved = true;

      await logActivity(
        company,
        "ExecutionRun",
        String(executionRunId),
        "AI Vision Verdict",
        `Test "${testCase.caseName}" (${viewport}) verified as ${result.verdict} (${result.confidence}% confidence)`,
        user.name || user.email || "AI Vision Agent",
        undefined,
        workspaceId
      );
    }
  }

  return NextResponse.json({
    data: result,
    saved,
    viewport,
    testCaseId,
  });
}
