import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { failureContext, getScopedRun, parseSteps, proposeScriptFix } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ai: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    apiKey: z.string().default(""),
    publicUrl: z.string().default(""),
  }),
});

// POST /api/execution-runs/[id]/cases/[caseId]/fix-with-ai - explain a failed AI step and propose a corrected script
export async function POST(request: Request, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, caseId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick an AI provider and model first (Settings > AI)" }, { status: 400 });

  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const row = await db.get<{ steps: string; runnerError: string; caseName: string; automationScript: string }>(
    `SELECT v."steps", v."runnerError", tc."caseName", COALESCE(tc."automationScript", '') AS "automationScript"
     FROM "CaseVerdict" v JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER) AND v."testCaseId" = CAST(? AS INTEGER)`,
    [id, caseId],
  );
  if (!row) return NextResponse.json({ error: "Case is not part of this run" }, { status: 404 });
  if (!row.automationScript.trim()) return NextResponse.json({ error: "This case has no automation script yet" }, { status: 400 });

  const { failedStep, screenshot } = failureContext(parseSteps(row.steps).filter((s) => s.action !== "a11y-scan"));
  try {
    const fix = await proposeScriptFix(
      { script: row.automationScript, caseName: row.caseName, failedStep, error: row.runnerError, screenshot },
      parsed.data.ai,
      { workspaceId: user.activeWorkspaceId ?? null, userId: user.id ?? null },
    );
    return NextResponse.json({ data: { cause: fix.cause, proposedScript: fix.proposedScript, currentScript: row.automationScript, warning: fix.invalid } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 502 });
  }
}
