import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { andWhere, params: qParams } = getAccessScope(user);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const canary = await db.get<{ id: number; name: string }>(
    `SELECT "id", "name" FROM "EnvironmentCanary"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [id, ...qParams]
  );

  if (!canary) {
    return NextResponse.json({ error: "Canary not found" }, { status: 404 });
  }

  const sets: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
  const vals: unknown[] = [];

  if (body.name !== undefined) { sets.push('"name" = ?'); vals.push(String(body.name).trim()); }
  if (body.url !== undefined) { sets.push('"url" = ?'); vals.push(String(body.url).trim()); }
  if (body.expectedStatus !== undefined) { sets.push('"expectedStatus" = ?'); vals.push(Number(body.expectedStatus)); }
  if (body.active !== undefined) { sets.push('"active" = ?'); vals.push(body.active ? 1 : 0); }
  if (body.project !== undefined) { sets.push('"project" = ?'); vals.push(String(body.project).trim()); }
  if (body.environment !== undefined) { sets.push('"environment" = ?'); vals.push(String(body.environment).trim()); }

  await db.run(
    `UPDATE "EnvironmentCanary" SET ${sets.join(", ")}
     WHERE "id" = CAST(? AS INTEGER)`,
    [...vals, id]
  );

  const updated = await db.get<Record<string, unknown>>(
    `SELECT * FROM "EnvironmentCanary" WHERE "id" = CAST(? AS INTEGER)`,
    [id]
  );

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { company, workspaceId, andWhere, params: qParams } = getAccessScope(user);

  await db.run(
    `UPDATE "EnvironmentCanary"
     SET "deletedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
    [id, ...qParams]
  );

  await logActivity(
    company,
    "EnvironmentCanary",
    String(id),
    "Deleted",
    `Canary health monitor #${id} removed`,
    user.name || user.email || "",
    undefined,
    workspaceId
  );

  return NextResponse.json({ ok: true });
}
