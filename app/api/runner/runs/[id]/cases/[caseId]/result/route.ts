import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordVerdict } from "@/lib/run-verdicts";
import { logActivity } from "@/lib/data-helpers";
import { getRunnerRun, getRunnerUser } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  index: z.number().int().min(0),
  action: z.string().max(200),
  locator: z.string().max(2000).optional().default(""),
  status: z.enum(["passed", "failed", "skipped"]),
  durationMs: z.number().min(0).default(0),
  // Small JPEG data URLs only; the runner compresses before sending.
  screenshot: z.string().max(400_000).regex(/^data:image\/(jpeg|png);base64,/).optional(),
  error: z.string().max(4000).optional(),
  replanned: z.boolean().optional(),
});

const bodySchema = z.object({
  verdict: z.enum(["Passed", "Failed", "Blocked"]),
  steps: z.array(stepSchema).max(200).default([]),
  durationMs: z.number().min(0).default(0),
  error: z.string().max(4000).optional(),
  healedScript: z.string().max(50_000).optional(),
  a11y: z.array(z.object({
    id: z.string(),
    impact: z.string().nullable().optional(),
    help: z.string().optional(),
    helpUrl: z.string().optional(),
    nodes: z.number().optional(),
  })).max(100).optional(),
});

// POST /api/runner/runs/[id]/cases/[caseId]/result - runner reports one case
export async function POST(request: Request, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, caseId } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  const body = parsed.data;

  const run = await getRunnerRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.runnerStatus !== "running") return NextResponse.json({ error: "Run is not running" }, { status: 409 });

  const inRun = await db.get<{ id: number }>(
    `SELECT "id" FROM "CaseVerdict" WHERE "executionRunId" = CAST(? AS INTEGER) AND "testCaseId" = CAST(? AS INTEGER)`,
    [id, caseId],
  );
  if (!inRun) return NextResponse.json({ error: "Case is not part of this run" }, { status: 404 });

  const failed = body.steps.find((s) => s.status === "failed");
  const actualResult = body.verdict === "Passed"
    ? `AI runner: all ${body.steps.length} steps passed.`
    : `AI runner: ${failed ? `step ${failed.index + 1} (${failed.action}) failed - ${failed.error || "no detail"}` : body.error || "run failed"}`;
  const lastShot = [...body.steps].reverse().find((s) => s.screenshot)?.screenshot;

  await recordVerdict({
    runId: id,
    testCaseId: caseId,
    verdict: body.verdict,
    company: String(run.company || ""),
    workspaceId: (run.workspaceId as number | null) ?? null,
    actualResult,
    evidence: lastShot,
    duration: Math.round(body.durationMs / 1000),
    // Stays a JSON array; the a11y scan rides along as a trailing "a11y-scan" entry.
    steps: JSON.stringify(body.a11y?.length
      ? [...body.steps, { index: body.steps.length, action: "a11y-scan", status: "passed", durationMs: 0, a11y: body.a11y }]
      : body.steps),
    runnerError: body.error ?? "",
    // Healed script is a pending suggestion; the case itself is not overwritten.
    aiAnalysis: body.healedScript ? JSON.stringify({ healedScript: body.healedScript }) : undefined,
    source: "ai-runner",
  });

  await logActivity(String(run.company || ""), "ExecutionRun", String(id), "Updated", `AI runner marked case ${caseId} ${body.verdict}`, `api:${user.name || user.email}`, undefined, (run.workspaceId as number | null) ?? null);
  return NextResponse.json({ data: { ok: true } });
}
