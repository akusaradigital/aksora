import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { requireWorkspaceCapability } from "@/lib/capabilities";
import { caseTemplateSchema } from "@/lib/case-fields";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireWorkspaceCapability("settings.manage");
  if ("error" in guard) return guard.error;
  const id = Number((await params).id);
  const parsed = caseTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: parsed.error?.issues[0]?.message || "Invalid template" }, { status: 400 });

  const t = parsed.data;
  const row = await db.transaction(async () => {
    if (t.isDefault) {
      await db.run(`UPDATE "CaseTemplate" SET "isDefault" = 0 WHERE "workspaceId" = ? AND "isDefault" = 1 AND "id" != ?`, [guard.workspaceId, id]);
    }
    return db.get<{ id: number }>(
      `UPDATE "CaseTemplate" SET "name" = ?, "description" = ?, "fields" = ?, "isDefault" = ?, "enabled" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL RETURNING "id"`,
      [t.name, t.description, JSON.stringify(t.fields), t.isDefault ? 1 : 0, t.enabled ? 1 : 0, id, guard.workspaceId],
    );
  });
  if (!row) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  await logActivity(guard.user.company, "case-template", String(id), "update", `Updated case template ${t.name}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id, ...t } });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireWorkspaceCapability("settings.manage");
  if ("error" in guard) return guard.error;
  const id = Number((await params).id);
  const row = await db.get<{ id: number }>(
    `UPDATE "CaseTemplate" SET "deletedAt" = CURRENT_TIMESTAMP, "isDefault" = 0 WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL RETURNING "id"`,
    [id, guard.workspaceId],
  );
  if (!row) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  await logActivity(guard.user.company, "case-template", String(id), "delete", `Deleted case template #${id}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id } });
}
