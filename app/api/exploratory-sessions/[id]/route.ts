import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

// GET /api/exploratory-sessions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { andWhere, params: qParams } = getAccessScope(user);

  const session = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExploratorySession"
     WHERE ("id" = CAST(? AS INTEGER) OR "publicToken" = ?) AND "deletedAt" IS NULL${andWhere}`,
    [Number.isInteger(Number(id)) ? id : -1, id, ...qParams]
  );

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ data: session });
}

// PATCH /api/exploratory-sessions/[id] - update session notes, timer, or completion
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const session = await db.get<{ id: number; title: string; status: string }>(
    `SELECT "id", "title", "status" FROM "ExploratorySession"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams]
  );

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sets: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
  const vals: unknown[] = [];

  if (body.status !== undefined) {
    sets.push('"status" = ?');
    vals.push(String(body.status));
    if (body.status === "completed") {
      sets.push('"completedAt" = CURRENT_TIMESTAMP');
    }
  }

  if (body.actualDurationMinutes !== undefined) {
    sets.push('"actualDurationMinutes" = ?');
    vals.push(Number(body.actualDurationMinutes));
  }

  if (body.notes !== undefined) {
    sets.push('"notes" = ?');
    vals.push(typeof body.notes === "string" ? body.notes : JSON.stringify(body.notes));
  }

  if (body.charter !== undefined) {
    sets.push('"charter" = ?');
    vals.push(String(body.charter));
  }

  if (body.bugsFound !== undefined) {
    sets.push('"bugsFound" = ?');
    vals.push(Number(body.bugsFound));
  }

  await db.run(
    `UPDATE "ExploratorySession" SET ${sets.join(", ")}
     WHERE "id" = CAST(? AS INTEGER)`,
    [...vals, id]
  );

  const updated = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExploratorySession" WHERE "id" = CAST(? AS INTEGER)`,
    [id]
  );

  if (body.status === "completed") {
    await logActivity(
      company,
      "ExploratorySession",
      String(id),
      "Charter Completed",
      `Session "${session.title}" completed (${body.actualDurationMinutes || 0}m, ${body.bugsFound || 0} bugs logged)`,
      user.name || user.email || "",
      undefined,
      workspaceId
    );
  }

  return NextResponse.json({ data: updated });
}

// DELETE /api/exploratory-sessions/[id] - soft delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);

  await db.run(
    `UPDATE "ExploratorySession"
     SET "deletedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
    [id, ...qParams]
  );

  await logActivity(
    company,
    "ExploratorySession",
    String(id),
    "Deleted",
    `Exploratory charter #${id} removed`,
    user.name || user.email || "",
    undefined,
    workspaceId
  );

  return NextResponse.json({ ok: true });
}
