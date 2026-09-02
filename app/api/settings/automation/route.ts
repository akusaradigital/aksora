import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = getAccessScope(user);
  const rules = await db.query(
    `SELECT * FROM "AutomationRule" WHERE "company" = ? OR "company" = '' ORDER BY "createdAt" DESC`,
    [scope.company]
  );
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = getAccessScope(user);
  const body = await req.json().catch(() => ({}));
  const { name, module = "tasks", triggerField, triggerValue, actionType, actionValue } = body;

  if (!name || !triggerField || !triggerValue || !actionType || !actionValue) {
    return NextResponse.json({ error: "Missing required rule fields" }, { status: 400 });
  }

  await db.run(
    `INSERT INTO "AutomationRule" ("workspaceId", "company", "name", "module", "triggerField", "triggerValue", "actionType", "actionValue", "active")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [user.workspaceId ?? null, scope.company, name, module, triggerField, triggerValue, actionType, actionValue]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const scope = getAccessScope(user);
  await db.run(
    `DELETE FROM "AutomationRule" WHERE "id" = CAST(? AS INTEGER) AND ("company" = ? OR "company" = '')`,
    [id, scope.company]
  );
  return NextResponse.json({ ok: true });
}
