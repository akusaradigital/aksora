import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

/**
 * DELETE /api/module-views/[id]
 * Supports lookup by numeric id or publicToken.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;
  const { company } = getAccessScope(user);

  const numericId = Number(idStr);
  const isNumeric = Number.isInteger(numericId) && numericId > 0;

  try {
    const existing = await db.get<{ id: number; userId: number }>(
      isNumeric
        ? `SELECT "id", "userId" FROM "ModuleView" WHERE "id" = ? AND "company" = ? AND "deletedAt" IS NULL`
        : `SELECT "id", "userId" FROM "ModuleView" WHERE "publicToken" = ? AND "company" = ? AND "deletedAt" IS NULL`,
      [isNumeric ? numericId : idStr, company],
    );

    if (!existing) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Only the owner can delete this view" }, { status: 403 });
    }

    await db.run(
      `UPDATE "ModuleView" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      [existing.id],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ModuleViews DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete view" }, { status: 500 });
  }
}

/**
 * PATCH /api/module-views/[id]
 * Supports lookup by numeric id or publicToken.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { company } = getAccessScope(user);

  const numericId = Number(idStr);
  const isNumeric = Number.isInteger(numericId) && numericId > 0;

  try {
    const existing = await db.get<{ id: number; userId: number; module: string }>(
      isNumeric
        ? `SELECT "id", "userId", "module" FROM "ModuleView" WHERE "id" = ? AND "company" = ? AND "deletedAt" IS NULL`
        : `SELECT "id", "userId", "module" FROM "ModuleView" WHERE "publicToken" = ? AND "company" = ? AND "deletedAt" IS NULL`,
      [isNumeric ? numericId : idStr, company],
    );

    if (!existing) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Only the owner can update this view" }, { status: 403 });
    }

    const name = String(body.name ?? "").trim();
    if (!name || name.length > 50) {
      return NextResponse.json({ error: "name must be between 1 and 50 characters" }, { status: 400 });
    }

    const filters = JSON.stringify(body.filters ?? []);
    const search = String(body.search ?? "").trim();
    const viewMode = body.viewMode === "kanban" ? "kanban" : "table";
    const shared = body.shared ? 1 : 0;
    const isDefault = body.isDefault ? 1 : 0;

    if (isDefault) {
      await db.run(
        `UPDATE "ModuleView" SET "isDefault" = 0 WHERE "company" = ? AND "userId" = ? AND "module" = ? AND "id" != ? AND "deletedAt" IS NULL`,
        [company, user.id, existing.module, existing.id],
      );
    }

    await db.run(
      `UPDATE "ModuleView" SET "name" = ?, "filters" = ?, "search" = ?, "viewMode" = ?, "shared" = ?, "isDefault" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
      [name, filters, search, viewMode, shared, isDefault, existing.id],
    );

    const view = await db.get(
      `SELECT * FROM "ModuleView" WHERE "id" = ?`,
      [existing.id],
    );

    return NextResponse.json({ view });
  } catch (error) {
    console.error("ModuleViews PATCH error:", error);
    return NextResponse.json({ error: "Failed to update view" }, { status: 500 });
  }
}
