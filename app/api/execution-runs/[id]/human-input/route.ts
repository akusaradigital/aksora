import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/data-helpers";
import { getScopedRun } from "@/lib/ai-runner";
import { answerHumanPrompt } from "@/lib/ai-runner-live";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ promptId: z.string().min(1).max(200), answer: z.string().max(2000) });

// POST /api/execution-runs/[id]/human-input - a person answers the pending runner question
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "promptId and answer are required" }, { status: 400 });
  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (!answerHumanPrompt(parsed.data.promptId, Number(id), parsed.data.answer)) {
    return NextResponse.json({ error: "This question expired or was already answered" }, { status: 409 });
  }
  // The answer is not logged: it is often an OTP or password.
  await logActivity(String(run.company || ""), "ExecutionRun", String(id), "Updated", "Answered AI runner question",
    user.name || user.email || "", undefined, (run.workspaceId as number | null) ?? null);
  return NextResponse.json({ data: { ok: true } });
}
