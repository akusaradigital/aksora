import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getRunnerRun, getRunnerUser, parseRunnerOptions, proposeScriptFix, runnerAi } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  script: z.string().min(1).max(50_000),
  error: z.string().max(4000).default(""),
  failedStep: z.object({
    index: z.number().int(), action: z.string(), locator: z.string().optional(), status: z.enum(["passed", "failed", "skipped"]),
    durationMs: z.number().default(0), error: z.string().optional(),
  }).optional(),
  screenshot: z.string().max(400_000).regex(/^data:image\/(jpeg|png);base64,/).optional(),
});

// POST /api/runner/runs/[id]/cases/[caseId]/heal - runner auto-heal, same logic as "Fix with AI" but with the run's stored key
export async function POST(request: Request, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, caseId } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });

  const run = await getRunnerRun(user, id);
  if (!run || run.runnerStatus !== "running") return NextResponse.json({ error: "Run not found or not running" }, { status: 404 });
  const opts = parseRunnerOptions(run.runnerOptions);
  if (!opts?.autoHeal) return NextResponse.json({ error: "Auto-heal is off for this run" }, { status: 400 });

  const tc = await db.get<{ caseName: string }>(`SELECT "caseName" FROM "TestCase" WHERE "id" = CAST(? AS INTEGER)`, [caseId]);
  try {
    const fix = await proposeScriptFix(
      { script: parsed.data.script, caseName: tc?.caseName || "", failedStep: parsed.data.failedStep, error: parsed.data.error, screenshot: parsed.data.screenshot },
      runnerAi(opts),
      { workspaceId: (run.workspaceId as number | null) ?? null, userId: user.id },
    );
    if (fix.invalid) return NextResponse.json({ error: `Healed script rejected: ${fix.invalid}` }, { status: 422 });
    return NextResponse.json({ data: { cause: fix.cause, proposedScript: fix.proposedScript } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Heal failed" }, { status: 502 });
  }
}
