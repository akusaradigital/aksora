import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { requireWorkspaceCapability } from "@/lib/capabilities";
import { caseTemplateSchema, parseJsonObject } from "@/lib/case-fields";

export const dynamic = "force-dynamic";

type TemplateRow = { id: number; name: string; description: string; fields: string; isDefault: number; enabled: number };

export async function GET() {
  const guard = await requireWorkspaceCapability(null);
  if ("error" in guard) return guard.error;
  const rows = await db.query<TemplateRow>(
    `SELECT "id", "name", "description", "fields", "isDefault", "enabled" FROM "CaseTemplate"
     WHERE "workspaceId" = ? AND "deletedAt" IS NULL ORDER BY "isDefault" DESC, "name" ASC`,
    [guard.workspaceId],
  );
  return NextResponse.json({
    data: rows.map((r) => ({ ...r, isDefault: Boolean(r.isDefault), enabled: Boolean(r.enabled), fields: parseJsonObject(r.fields, {}) })),
  });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceCapability("settings.manage");
  if ("error" in guard) return guard.error;
  const parsed = caseTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid template" }, { status: 400 });

  const t = parsed.data;
  const row = await db.transaction(async () => {
    if (t.isDefault) {
      await db.run(`UPDATE "CaseTemplate" SET "isDefault" = 0 WHERE "workspaceId" = ? AND "isDefault" = 1`, [guard.workspaceId]);
    }
    return db.get<{ id: number }>(
      `INSERT INTO "CaseTemplate" ("workspaceId", "name", "description", "fields", "isDefault", "enabled") VALUES (?, ?, ?, ?, ?, ?) RETURNING "id"`,
      [guard.workspaceId, t.name, t.description, JSON.stringify(t.fields), t.isDefault ? 1 : 0, t.enabled ? 1 : 0],
    );
  });
  await logActivity(guard.user.company, "case-template", String(row?.id), "create", `Created case template ${t.name}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id: row?.id, ...t } }, { status: 201 });
}
