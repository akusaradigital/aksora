import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshRunCounts } from "@/lib/run-verdicts";
import { logActivity } from "@/lib/data-helpers";
import { finishRun, getRunnerRun, getRunnerUser } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ status: z.enum(["done", "error"]), error: z.string().max(2000).optional() });

// POST /api/runner/runs/[id]/finish - runner closes the run
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRunnerUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "status must be done or error" }, { status: 400 });
  const run = await getRunnerRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  await refreshRunCounts(id);
  await finishRun(Number(id), parsed.data.status);
  await logActivity(String(run.company || ""), "ExecutionRun", String(id), "Updated",
    `AI run finished (${parsed.data.status})${parsed.data.error ? `: ${parsed.data.error}` : ""}`, `api:${user.name || user.email}`, undefined, (run.workspaceId as number | null) ?? null);
  return NextResponse.json({ data: { ok: true } });
}
