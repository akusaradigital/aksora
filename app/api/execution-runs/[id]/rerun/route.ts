import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity, getAccessScope } from "@/lib/data-helpers";
import { refreshRunCounts } from "@/lib/run-verdicts";

const schema = z.object({
  mode: z.enum(["failed", "failed_untested", "selected"]),
  testCaseIds: z.array(z.number().int().positive()).max(5000).optional(),
});

const MODE_VERDICTS: Record<string, string[]> = {
  failed: ["Failed", "Blocked"],
  failed_untested: ["Failed", "Blocked", "Pending"],
};

// POST /api/execution-runs/[id]/rerun - start a new attempt on failed / untested / selected cases
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid re-run request" }, { status: 400 });
  const { mode, testCaseIds } = parsed.data;
  if (mode === "selected" && !testCaseIds?.length) {
    return NextResponse.json({ error: "Select at least one case to re-run" }, { status: 400 });
  }

  const { id } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);

  try {
    const run = await db.get<{ id: number; runNumber: number; attempt: number }>(
      `SELECT "id", "runNumber", "attempt" FROM "ExecutionRun"
       WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
      [id, ...qParams],
    );
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

    const targets = mode === "selected"
      ? await db.query<{ testCaseId: number }>(
          `SELECT "testCaseId" FROM "CaseVerdict" WHERE "executionRunId" = ? AND "testCaseId" = ANY(?::int[])`,
          [run.id, testCaseIds],
        )
      : await db.query<{ testCaseId: number }>(
          `SELECT "testCaseId" FROM "CaseVerdict" WHERE "executionRunId" = ? AND "verdict" = ANY(?::text[])`,
          [run.id, MODE_VERDICTS[mode]],
        );
    if (targets.length === 0) return NextResponse.json({ error: "No cases match this re-run" }, { status: 400 });

    const ids = targets.map((t) => Number(t.testCaseId));
    const attempt = (Number(run.attempt) || 1) + 1;

    // CaseVerdictAttempt history rows are kept; only the latest verdict is reset.
    await db.run(
      `UPDATE "CaseVerdict" SET "verdict" = 'Pending', "attempt" = ?, "runnerError" = '', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "executionRunId" = ? AND "testCaseId" = ANY(?::int[])`,
      [attempt, run.id, ids],
    );
    await db.run(
      `UPDATE "ExecutionRun" SET "attempt" = ?, "status" = 'in-progress', "completedAt" = NULL,
         "runnerStatus" = CASE WHEN "runType" = 'ai' THEN 'queued' ELSE "runnerStatus" END,
         "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      [attempt, run.id],
    );
    await refreshRunCounts(run.id);

    await logActivity(company, "ExecutionRun", String(run.id), "Re-run",
      `Run #${run.runNumber} attempt #${attempt}: re-running ${ids.length} case(s) (${mode})`,
      user.name || user.email || "", undefined, workspaceId);

    return NextResponse.json({ data: { attempt, count: ids.length } });
  } catch (error) {
    console.error("Execution run rerun error:", error);
    return NextResponse.json({ error: "Failed to start re-run" }, { status: 500 });
  }
}
