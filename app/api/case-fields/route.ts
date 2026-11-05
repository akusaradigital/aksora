import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { requireWorkspaceCapability } from "@/lib/capabilities";
import { caseFieldSchema, toFieldDef } from "@/lib/case-fields";

export const dynamic = "force-dynamic";

type FieldRow = { id: number; key: string; label: string; kind: string; options: string; required: number; sortOrder: number };

export async function GET() {
  const guard = await requireWorkspaceCapability(null);
  if ("error" in guard) return guard.error;
  const rows = await db.query<FieldRow>(
    `SELECT "id", "key", "label", "kind", "options", "required", "sortOrder" FROM "CaseFieldDef"
     WHERE "workspaceId" = ? AND "deletedAt" IS NULL ORDER BY "sortOrder" ASC, "id" ASC`,
    [guard.workspaceId],
  );
  return NextResponse.json({ data: rows.map(toFieldDef) });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceCapability("settings.manage");
  if ("error" in guard) return guard.error;
  const parsed = caseFieldSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid field" }, { status: 400 });

  const f = parsed.data;
  const clash = await db.get<{ id: number }>(
    `SELECT "id" FROM "CaseFieldDef" WHERE "workspaceId" = ? AND "key" = ? AND "deletedAt" IS NULL`,
    [guard.workspaceId, f.key],
  );
  if (clash) return NextResponse.json({ error: `A field with key "${f.key}" already exists` }, { status: 409 });

  const row = await db.get<{ id: number }>(
    `INSERT INTO "CaseFieldDef" ("workspaceId", "key", "label", "kind", "options", "required", "sortOrder")
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING "id"`,
    [guard.workspaceId, f.key, f.label, f.kind, JSON.stringify(f.kind === "select" ? f.options : []), f.required ? 1 : 0, f.sortOrder],
  );
  await logActivity(guard.user.company, "case-field", String(row?.id), "create", `Created case field ${f.label}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id: row?.id, ...f } }, { status: 201 });
}
