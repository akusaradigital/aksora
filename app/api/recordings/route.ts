import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { getSessionOrApiUser } from "@/lib/ai-runner";
import { createRecordingSchema, recordingScope } from "@/lib/recordings";

export const dynamic = "force-dynamic";

// GET /api/recordings - list recordings (session or API key)
export async function GET(request: Request) {
  const user = await getSessionOrApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = recordingScope(user);
  const rows = await db.query<Record<string, unknown>>(
    `SELECT r."id", r."title", r."startUrl", r."status", r."testCaseId", r."createdAt", r."events",
            tc."publicToken" AS "testCasePublicToken", tc."tcId"
     FROM "Recording" r LEFT JOIN "TestCase" tc ON tc."id" = r."testCaseId"
     WHERE r."deletedAt" IS NULL AND r.${scope.sql}
     ORDER BY r."id" DESC LIMIT 200`,
    [scope.param],
  );
  const data = rows.map(({ events, ...r }) => {
    let steps = 0;
    try { steps = (JSON.parse(String(events || "[]")) as unknown[]).length; } catch { /* malformed rows count as 0 */ }
    return { ...r, steps };
  });
  return NextResponse.json({ data: JSON.parse(JSON.stringify(data)) });
}

// POST /api/recordings - save a recording from the Chrome extension (API key) or the app (session)
export async function POST(request: Request) {
  const user = await getSessionOrApiUser(request, true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createRecordingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid recording" }, { status: 400 });

  const workspaceId = user.activeWorkspaceId ?? null;
  const row = await db.get<{ id: number }>(
    `INSERT INTO "Recording" ("workspaceId", "userId", "title", "startUrl", "events", "status")
     VALUES (?, ?, ?, ?, ?, 'draft') RETURNING "id"`,
    [workspaceId, user.id ?? null, parsed.data.title, parsed.data.startUrl, JSON.stringify(parsed.data.events)],
  );
  await logActivity(String(user.company || ""), "Recording", String(row?.id), "Created", `Recorded "${parsed.data.title}" (${parsed.data.events.length} steps)`,
    user.name || user.email || "", undefined, workspaceId);
  return NextResponse.json({ data: { id: Number(row?.id) } });
}
