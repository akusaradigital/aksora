import { NextResponse } from "next/server";
import { z } from "zod";
import { getRunnerRun, getRunnerUser } from "@/lib/ai-runner";
import { setLiveFrame } from "@/lib/ai-runner-live";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  caseId: z.number().int(),
  stepLabel: z.string().max(500).default(""),
  url: z.string().max(2000).default(""),
  screenshot: z.string().max(400_000).regex(/^data:image\/(jpeg|png);base64,/).or(z.literal("")).default(""),
});

// POST /api/runner/runs/[id]/live - runner pushes the latest frame
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  const run = await getRunnerRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  setLiveFrame(Number(id), parsed.data);
  return NextResponse.json({ data: { ok: true } });
}
