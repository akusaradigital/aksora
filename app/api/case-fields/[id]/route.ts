import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { requireWorkspaceCapability } from "@/lib/capabilities";
import { caseFieldSchema } from "@/lib/case-fields";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// The key is immutable after creation: existing TestCase."customFields" values are stored under it.
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireWorkspaceCapability("settings.manage");
  if ("error" in guard) return guard.error;
  const id = Number((await params).id);
  const existing = await db.get<{ key: string }>(
    `SELECT "key" FROM "CaseFieldDef" WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL`,
    [id, guard.workspaceId],
  );
  if (!existing) return NextResponse.json({ error: "Field not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = caseFieldSchema.safeParse({ ...(body && typeof body === "object" ? body : {}), key: existing.key });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid field" }, { status: 400 });

  const f = parsed.data;
  await db.run(
    `UPDATE "CaseFieldDef" SET "label" = ?, "kind" = ?, "options" = ?, "required" = ?, "sortOrder" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "workspaceId" = ?`,
    [f.label, f.kind, JSON.stringify(f.kind === "select" ? f.options : []), f.required ? 1 : 0, f.sortOrder, id, guard.workspaceId],
  );
  await logActivity(guard.user.company, "case-field", String(id), "update", `Updated case field ${f.label}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id, ...f } });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireWorkspaceCapability("settings.manage");
  if ("error" in guard) return guard.error;
  const id = Number((await params).id);
  const row = await db.get<{ id: number }>(
    `UPDATE "CaseFieldDef" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL RETURNING "id"`,
    [id, guard.workspaceId],
  );
  if (!row) return NextResponse.json({ error: "Field not found" }, { status: 404 });
  await logActivity(guard.user.company, "case-field", String(id), "delete", `Deleted case field #${id}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id } });
}
