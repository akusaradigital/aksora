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

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS "AutomationRule" (
        "id" SERIAL PRIMARY KEY,
        "workspaceId" INTEGER,
        "company" TEXT NOT NULL DEFAULT '',
        "name" TEXT NOT NULL,
        "module" TEXT NOT NULL DEFAULT 'tasks',
        "triggerField" TEXT NOT NULL,
        "triggerValue" TEXT NOT NULL,
        "actionType" TEXT NOT NULL,
        "actionValue" TEXT NOT NULL,
        "active" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(
      `INSERT INTO "AutomationRule" ("workspaceId", "company", "name", "module", "triggerField", "triggerValue", "actionType", "actionValue", "active")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [scope.workspaceId ?? user.activeWorkspaceId ?? null, scope.company, name, module, triggerField, triggerValue, actionType, actionValue]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Automation rule POST error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create automation rule.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const scope = getAccessScope(user);
  try {
    await db.run(
      `DELETE FROM "AutomationRule" WHERE "id" = CAST(? AS INTEGER) AND ("company" = ? OR "company" = '')`,
      [id, scope.company]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Automation rule DELETE error:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete automation rule.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
