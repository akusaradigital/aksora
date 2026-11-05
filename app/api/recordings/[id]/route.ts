import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { getSessionOrApiUser } from "@/lib/ai-runner";
import { recordingScope } from "@/lib/recordings";

export const dynamic = "force-dynamic";

// GET /api/recordings/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const scope = recordingScope(user);
  const row = await db.get<Record<string, unknown>>(
    `SELECT * FROM "Recording" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND ${scope.sql}`,
    [id, scope.param],
  );
  if (!row) return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  let events: unknown[] = [];
  try { events = JSON.parse(String(row.events || "[]")); } catch { /* keep empty */ }
  return NextResponse.json({ data: JSON.parse(JSON.stringify({ ...row, events })) });
}

// DELETE /api/recordings/[id] - soft delete
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionOrApiUser(request, true);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const scope = recordingScope(user);
  const row = await db.get<{ id: number; title: string }>(
    `UPDATE "Recording" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND ${scope.sql} RETURNING "id", "title"`,
    [id, scope.param],
  );
  if (!row) return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  await logActivity(String(user.company || ""), "Recording", String(id), "Deleted", `Deleted recording "${row.title}"`,
    user.name || user.email || "", undefined, user.activeWorkspaceId ?? null);
  return NextResponse.json({ data: { ok: true } });
}
