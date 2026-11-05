import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getScopedRun } from "@/lib/ai-runner";
import { saveAutomationScript } from "@/lib/ai-runner-script";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ proposedScript: z.string().min(1).max(50_000) });

// POST /api/execution-runs/[id]/cases/[caseId]/apply-fix - save the proposed (or healed) script onto the test case
export async function POST(request: Request, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, caseId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "proposedScript is required" }, { status: 400 });

  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const failure = await saveAutomationScript(user, caseId, parsed.data.proposedScript, `Applied AI script fix from run #${run.runNumber}`);
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });

  // Clear a pending healed-script suggestion now that a script was chosen.
  await db.run(
    `UPDATE "CaseVerdict" SET "aiAnalysis" = '' WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER) AND "aiAnalysis" LIKE '{"healedScript"%'`,
    [id, caseId],
  );
  return NextResponse.json({ data: { ok: true } });
}
