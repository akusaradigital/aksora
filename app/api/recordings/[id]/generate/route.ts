import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, makePublicToken } from "@/lib/data-helpers";
import { createModuleRecord } from "@/lib/data";
import { moduleConfigs, normalizeModuleEntry } from "@/lib/modules";
import { nextTcId, recordingScope, recordingToCase, recordingEventSchema } from "@/lib/recordings";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  testSuiteId: z.coerce.number().int().positive(),
  ai: z.object({ provider: z.string().min(1), model: z.string().min(1), apiKey: z.string().default(""), publicUrl: z.string().default("") }),
});

// POST /api/recordings/[id]/generate - turn a recording into a test case (+ Midscene script) in a suite
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a suite and an AI model first" }, { status: 400 });

  const scope = recordingScope(user);
  const rec = await db.get<{ id: number; title: string; startUrl: string; events: string }>(
    `SELECT "id", "title", "startUrl", "events" FROM "Recording" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND ${scope.sql}`,
    [id, scope.param],
  );
  if (!rec) return NextResponse.json({ error: "Recording not found" }, { status: 404 });

  const { andWhere, params: qp } = getAccessScope(user);
  const suite = await db.get<{ id: number }>(
    `SELECT "id" FROM "TestSuite" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [parsed.data.testSuiteId, ...qp],
  );
  if (!suite) return NextResponse.json({ error: "Suite not found" }, { status: 404 });

  const events = z.array(recordingEventSchema).safeParse(JSON.parse(rec.events || "[]"));
  if (!events.success || !events.data.length) return NextResponse.json({ error: "This recording has no usable steps" }, { status: 400 });

  try {
    const draft = await recordingToCase(
      { title: rec.title, startUrl: rec.startUrl, events: events.data },
      parsed.data.ai,
      { workspaceId: user.activeWorkspaceId ?? null, userId: user.id ?? null },
    );
    const publicToken = makePublicToken();
    const entry = moduleConfigs["test-cases"].schema.safeParse(normalizeModuleEntry("test-cases", {
      testSuiteId: String(suite.id), tcId: await nextTcId(suite.id), caseName: draft.caseName, typeCase: draft.typeCase,
      preCondition: draft.preCondition, testStep: draft.testStep, expectedResult: draft.expectedResult,
      status: "Pending", priority: draft.priority, assignee: "", actualResult: "", category: "", rationale: `Generated from recording "${rec.title}"`,
    }));
    if (!entry.success) return NextResponse.json({ error: entry.error.issues[0]?.message ?? "Generated case is invalid" }, { status: 422 });

    // createModuleRecord handles activity logging and search indexing for the new case.
    await createModuleRecord("test-cases", { ...moduleConfigs["test-cases"].coerce(entry.data as Record<string, string>), publicToken });
    const tc = await db.get<{ id: number }>(`SELECT "id" FROM "TestCase" WHERE "publicToken" = ? ORDER BY "id" DESC LIMIT 1`, [publicToken]);
    if (!tc) throw new Error("Test case was not created");
    if (draft.automationScript) {
      await db.run(`UPDATE "TestCase" SET "automationScript" = ? WHERE "id" = ?`, [draft.automationScript, tc.id]);
    }
    await db.run(
      `UPDATE "Recording" SET "status" = 'generated', "testCaseId" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      [tc.id, rec.id],
    );
    return NextResponse.json({ data: { testCaseId: tc.id, publicToken, caseName: draft.caseName, hasScript: Boolean(draft.automationScript) } });
  } catch (error) {
    await db.run(`UPDATE "Recording" SET "status" = 'failed', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [rec.id]);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 502 });
  }
}
