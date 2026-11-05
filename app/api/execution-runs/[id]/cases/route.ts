import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getScopedRun, getSessionOrApiUser, parseSteps } from "@/lib/ai-runner";

export const dynamic = "force-dynamic";

// GET /api/execution-runs/[id]/cases - AI runner results per case (steps, a11y, healed-script suggestion)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const run = await getScopedRun(user, id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const rows = await db.query<Record<string, unknown>>(
    `SELECT v."testCaseId", v."verdict", v."steps", v."runnerError", v."aiAnalysis",
            tc."tcId", tc."caseName", COALESCE(tc."automationScript", '') AS "automationScript"
     FROM "CaseVerdict" v JOIN "TestCase" tc ON tc."id" = v."testCaseId"
     WHERE v."executionRunId" = CAST(? AS INTEGER)
     ORDER BY tc."sortOrder" ASC, tc."id" ASC`,
    [id],
  );

  const cases = rows.map((r) => {
    const all = parseSteps(r.steps) as unknown as Array<Record<string, unknown>>;
    const a11yEntry = all.find((s) => s.action === "a11y-scan");
    let healedScript = "";
    try {
      healedScript = String((JSON.parse(String(r.aiAnalysis || "{}")) as { healedScript?: string }).healedScript || "");
    } catch {
      // aiAnalysis also holds manual vision results, which are not JSON we care about here
    }
    return {
      testCaseId: Number(r.testCaseId),
      tcId: String(r.tcId || ""),
      caseName: String(r.caseName || ""),
      verdict: String(r.verdict || "Pending"),
      runnerError: String(r.runnerError || ""),
      hasScript: Boolean(String(r.automationScript).trim()),
      automationScript: String(r.automationScript),
      steps: all.filter((s) => s.action !== "a11y-scan"),
      a11y: (a11yEntry?.a11y as unknown[]) ?? [],
      healedScript,
    };
  });
  return NextResponse.json({
    data: { runnerStatus: String(run.runnerStatus || ""), runType: String(run.runType || ""), status: String(run.status || ""), cases },
  });
}
