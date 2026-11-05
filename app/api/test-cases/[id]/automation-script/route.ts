import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";
import { actionExportAutomation } from "@/lib/ai-qa-actions";
import { getSessionOrApiUser, validateMidsceneYaml } from "@/lib/ai-runner";
import { saveAutomationScript } from "@/lib/ai-runner-script";

export const dynamic = "force-dynamic";

const generateSchema = z.object({
  ai: z.object({ provider: z.string().min(1), model: z.string().min(1), apiKey: z.string().default(""), publicUrl: z.string().default("") }),
});
const saveSchema = z.object({ script: z.string().max(50_000) });

async function loadCase(user: NonNullable<Awaited<ReturnType<typeof getSessionOrApiUser>>>, id: string) {
  const { andWhere, params } = getAccessScope(user);
  return db.get<{ id: number; caseName: string; preCondition: string; testStep: string; expectedResult: string; automationScript: string }>(
    `SELECT "id", "caseName", "preCondition", "testStep", "expectedResult", COALESCE("automationScript", '') AS "automationScript"
     FROM "TestCase" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...params],
  );
}

// GET /api/test-cases/[id]/automation-script
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tc = await loadCase(user, (await params).id);
  if (!tc) return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  return NextResponse.json({ data: { script: tc.automationScript } });
}

// POST /api/test-cases/[id]/automation-script - generate Midscene YAML from the manual steps and save it
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request, true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = generateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick an AI provider and model first (Settings > AI)" }, { status: 400 });

  const tc = await loadCase(user, id);
  if (!tc) return NextResponse.json({ error: "Test case not found" }, { status: 404 });

  try {
    const out = await actionExportAutomation(
      { caseName: tc.caseName, preCondition: tc.preCondition, testStep: tc.testStep, expectedResult: tc.expectedResult, framework: "midscene" },
      { ...parsed.data.ai, usage: { feature: "generate_automation_script", workspaceId: user.activeWorkspaceId ?? null, userId: user.id ?? null } },
    );
    const script = String(out.code || "").trim();
    const invalid = validateMidsceneYaml(script);
    // An unusable draft is returned for editing but not saved.
    if (invalid) return NextResponse.json({ data: { script, saved: false, warning: invalid, notes: out.notes } });
    const failure = await saveAutomationScript(user, id, script, "Generated automation script");
    if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });
    return NextResponse.json({ data: { script, saved: true, notes: out.notes } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 502 });
  }
}

// PUT /api/test-cases/[id]/automation-script - save manual edits (empty string clears the script)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request, true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "script is required" }, { status: 400 });

  const failure = await saveAutomationScript(user, id, parsed.data.script, parsed.data.script.trim() ? "Edited automation script" : "Cleared automation script");
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });
  return NextResponse.json({ data: { saved: true } });
}
