import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { SUPPORTED_PROVIDERS } from "@/lib/ai-service";
import { encryptRunnerKey, getScopedRun, getSessionOrApiUser, inferModelFamily, type RunnerOptions } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
  model: z.string().min(1).max(200),
  // BYOK: keys live in the browser (lib/ai-keys.ts), as with /api/ai/qa-agent. Stored encrypted until the run finishes.
  apiKey: z.string().max(500).default(""),
  publicUrl: z.string().url().max(500).or(z.literal("")).default(""),
  baseUrl: z.string().url().max(2000).or(z.literal("")).default(""),
  locale: z.string().max(20).default(""),
  timezone: z.string().max(60).default(""),
  autoHeal: z.boolean().default(true),
});

// POST /api/execution-runs/[id]/ai-run - queue the run for the AI runner
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request, true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  const b = parsed.data;

  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.status !== "in-progress") return NextResponse.json({ error: "Only in-progress runs can be sent to the AI runner" }, { status: 400 });
  if (run.runnerStatus === "queued" || run.runnerStatus === "running") {
    return NextResponse.json({ error: "This run is already with the AI runner" }, { status: 409 });
  }
  if (!inferModelFamily(b.model)) {
    return NextResponse.json({ error: `"${b.model}" is not a vision model Midscene can drive. Pick a Gemini, GPT-5, Qwen-VL, Doubao, GLM-V or UI-TARS model.` }, { status: 400 });
  }
  if (!b.baseUrl && !run.environmentId) {
    return NextResponse.json({ error: "Set a base URL or attach an environment to this run" }, { status: 400 });
  }

  const missing = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS "n" FROM "CaseVerdict" v JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER) AND v."verdict" = 'Pending' AND COALESCE(tc."automationScript", '') = ''`,
    [id],
  );

  const options: RunnerOptions = {
    provider: b.provider, model: b.model, apiKeyEnc: encryptRunnerKey(b.apiKey), publicUrl: b.publicUrl,
    baseUrl: b.baseUrl, locale: b.locale, timezone: b.timezone, autoHeal: b.autoHeal,
  };
  await db.run(
    `UPDATE "ExecutionRun" SET "runType" = 'ai', "runnerStatus" = 'queued', "runnerOptions" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)`,
    [JSON.stringify(options), id],
  );
  await logActivity(String(run.company || ""), "ExecutionRun", String(id), "Updated", `Queued for AI runner (${b.provider}/${b.model})`,
    user.name || user.email || "", undefined, (run.workspaceId as number | null) ?? null);
  return NextResponse.json({ data: { runnerStatus: "queued", casesWithoutScript: Number(missing?.n) || 0 } });
}

// DELETE /api/execution-runs/[id]/ai-run - take a queued run back before a runner claims it
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request, true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (run.runnerStatus !== "queued") return NextResponse.json({ error: "Only queued runs can be cancelled" }, { status: 409 });
  await db.run(
    `UPDATE "ExecutionRun" SET "runnerStatus" = '', "runnerOptions" = '', "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER) AND "runnerStatus" = 'queued'`,
    [id],
  );
  await logActivity(String(run.company || ""), "ExecutionRun", String(id), "Updated", "AI run cancelled",
    user.name || user.email || "", undefined, (run.workspaceId as number | null) ?? null);
  return NextResponse.json({ data: { runnerStatus: "" } });
}
