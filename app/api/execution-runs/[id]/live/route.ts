import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getScopedRun } from "@/lib/ai-runner";
import { getLiveFrame, getPendingPrompt } from "@/lib/ai-runner-live";

export const dynamic = "force-dynamic";

// GET /api/execution-runs/[id]/live - latest runner frame, runner status and pending human prompt (polled ~1s)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const prompt = getPendingPrompt(Number(id));
  return NextResponse.json(
    {
      data: {
        runnerStatus: String(run.runnerStatus || ""),
        frame: getLiveFrame(Number(id)),
        prompt: prompt
          ? { id: prompt.id, caseId: prompt.caseId, prompt: prompt.prompt, expiresAt: new Date(prompt.expiresAt).toISOString() }
          : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
