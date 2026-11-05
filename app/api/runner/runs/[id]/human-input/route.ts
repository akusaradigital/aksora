import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRunnerRun, getRunnerUser } from "@/lib/ai-runner";
import { createHumanPrompt, getHumanPrompt } from "@/lib/ai-runner-live";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  caseId: z.number().int(),
  prompt: z.string().min(1).max(1000),
  timeoutSec: z.number().int().min(10).max(900).default(300),
});

// POST /api/runner/runs/[id]/human-input - runner asks a person for a value (OTP, captcha, ...)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  const run = await getRunnerRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const p = createHumanPrompt(Number(id), parsed.data.caseId, parsed.data.prompt, parsed.data.timeoutSec);
  return NextResponse.json({ data: { promptId: p.id, expiresAt: new Date(p.expiresAt).toISOString() } });
}

// GET /api/runner/runs/[id]/human-input?promptId=... - runner polls for the answer
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const p = getHumanPrompt(request.nextUrl.searchParams.get("promptId") || "");
  if (!p || p.runId !== Number(id)) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  const expired = p.answer === undefined && Date.now() > p.expiresAt;
  return NextResponse.json({ data: { answered: p.answer !== undefined, answer: p.answer ?? null, expired } });
}
