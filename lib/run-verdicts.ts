import { db } from "@/lib/db";

export const VERDICTS = ["Pending", "Passed", "Failed", "Blocked"] as const;
export type Verdict = (typeof VERDICTS)[number];
export type Maturity = "draft" | "stable" | "proven";

export type RecordVerdictInput = {
  runId: number | string;
  testCaseId: number | string;
  verdict: Verdict;
  company: string;
  workspaceId: number | null;
  actualResult?: unknown;
  evidence?: unknown;
  duration?: unknown;
  matrix?: string;
  aiAnalysis?: string;
  steps?: string;
  runnerError?: string;
  source?: "manual" | "ai-runner" | "ci";
};

/** Pure maturity rule: 2 straight passes = stable; 3+ straight passes over 2+ days = proven. */
export function computeMaturity(consecutivePasses: number, distinctPassDays: number): Maturity {
  if (consecutivePasses >= 3 && distinctPassDays >= 2) return "proven";
  if (consecutivePasses >= 2) return "stable";
  return "draft";
}

/**
 * Upserts the latest CaseVerdict, the per-attempt history row, run counters,
 * and the test case maturity. Shared by manual execution, re-runs and the AI runner.
 */
export async function recordVerdict(input: RecordVerdictInput) {
  const { runId, testCaseId, verdict, company, workspaceId } = input;
  const run = await db.get<{ attempt: number }>(
    `SELECT "attempt" FROM "ExecutionRun" WHERE "id" = CAST(? AS INTEGER)`,
    [runId],
  );
  const attempt = Number(run?.attempt) || 1;

  const existing = await db.get<{ id: number; verdict: string }>(
    `SELECT "id", "verdict" FROM "CaseVerdict"
     WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
    [runId, testCaseId],
  );

  if (existing) {
    const sets: string[] = ['"verdict" = ?', '"attempt" = ?', '"updatedAt" = CURRENT_TIMESTAMP'];
    const vals: unknown[] = [verdict, attempt];
    if (input.actualResult !== undefined) { sets.push('"actualResult" = ?'); vals.push(input.actualResult); }
    if (input.evidence !== undefined) { sets.push('"evidence" = ?'); vals.push(input.evidence); }
    if (input.duration !== undefined) { sets.push('"duration" = ?'); vals.push(input.duration); }
    if (input.matrix !== undefined) { sets.push('"matrix" = ?'); vals.push(input.matrix); }
    if (input.aiAnalysis !== undefined) { sets.push('"aiAnalysis" = ?'); vals.push(input.aiAnalysis); }
    if (input.steps !== undefined) { sets.push('"steps" = ?'); vals.push(input.steps); }
    if (input.runnerError !== undefined) { sets.push('"runnerError" = ?'); vals.push(input.runnerError); }
    if (verdict !== "Pending") sets.push('"executedAt" = CURRENT_TIMESTAMP');
    await db.run(
      `UPDATE "CaseVerdict" SET ${sets.join(", ")} WHERE "id" = ?`,
      [...vals, existing.id],
    );
  } else {
    await db.run(
      `INSERT INTO "CaseVerdict" ("company", "workspaceId", "executionRunId", "testCaseId", "verdict", "actualResult", "evidence", "duration", "matrix", "aiAnalysis", "attempt", "steps", "runnerError", "executedAt")
       VALUES (?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?, ?, ?, ?, ?, ?, ?, ${verdict !== "Pending" ? "CURRENT_TIMESTAMP" : "NULL"})`,
      [company, workspaceId, runId, testCaseId, verdict, input.actualResult || "", input.evidence || "", input.duration || 0, input.matrix || "", input.aiAnalysis || "", attempt, input.steps || "", input.runnerError || ""],
    );
  }

  if (verdict !== "Pending") {
    const prior = await db.get<{ id: number }>(
      `SELECT "id" FROM "CaseVerdictAttempt"
       WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER) AND "attempt" = ?`,
      [runId, testCaseId, attempt],
    );
    const vals = [verdict, input.actualResult || "", input.evidence || "", input.steps || "", input.duration || 0, input.source || "manual"];
    if (prior) {
      await db.run(
        `UPDATE "CaseVerdictAttempt" SET "verdict" = ?, "actualResult" = ?, "evidence" = ?, "steps" = ?, "duration" = ?, "source" = ? WHERE "id" = ?`,
        [...vals, prior.id],
      );
    } else {
      await db.run(
        `INSERT INTO "CaseVerdictAttempt" ("verdict", "actualResult", "evidence", "steps", "duration", "source", "workspaceId", "executionRunId", "testCaseId", "attempt")
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?)`,
        [...vals, workspaceId, runId, testCaseId, attempt],
      );
    }
  }

  await refreshRunCounts(runId);
  // Autosave fires repeatedly; only a changed verdict moves the pass streak.
  if (existing?.verdict !== verdict && (verdict === "Passed" || verdict === "Failed")) {
    await updateMaturity(testCaseId, verdict);
  }
  return { attempt };
}

export async function refreshRunCounts(runId: number | string) {
  const counts = await db.get<{ passed: number; failed: number; blocked: number }>(
    `SELECT
      SUM(CASE WHEN "verdict" = 'Passed' THEN 1 ELSE 0 END) as "passed",
      SUM(CASE WHEN "verdict" = 'Failed' THEN 1 ELSE 0 END) as "failed",
      SUM(CASE WHEN "verdict" = 'Blocked' THEN 1 ELSE 0 END) as "blocked"
     FROM "CaseVerdict" WHERE "executionRunId" = CAST(? AS INTEGER)`,
    [runId],
  );
  await db.run(
    `UPDATE "ExecutionRun" SET "passed" = ?, "failed" = ?, "blocked" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [Number(counts?.passed) || 0, Number(counts?.failed) || 0, Number(counts?.blocked) || 0, runId],
  );
}

async function updateMaturity(testCaseId: number | string, verdict: "Passed" | "Failed") {
  if (verdict === "Failed") {
    await db.run(
      `UPDATE "TestCase" SET "consecutivePasses" = 0, "maturity" = 'draft', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
      [testCaseId],
    );
    return;
  }
  const tc = await db.get<{ consecutivePasses: number }>(
    `SELECT "consecutivePasses" FROM "TestCase" WHERE "id" = CAST(? AS INTEGER)`,
    [testCaseId],
  );
  const streak = (Number(tc?.consecutivePasses) || 0) + 1;
  const days = await db.get<{ n: number }>(
    `SELECT COUNT(DISTINCT CAST("createdAt" AS DATE)) AS "n" FROM (
       SELECT "createdAt" FROM "CaseVerdictAttempt"
       WHERE "testCaseId" = CAST(? AS INTEGER) AND "verdict" = 'Passed'
       ORDER BY "createdAt" DESC LIMIT ?
     ) recent`,
    [testCaseId, streak],
  );
  await db.run(
    `UPDATE "TestCase" SET "consecutivePasses" = ?, "maturity" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
    [streak, computeMaturity(streak, Number(days?.n) || 0), testCaseId],
  );
}
