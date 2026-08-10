import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, makePublicToken } from "@/lib/data-helpers";

/**
 * GET /api/module-views?module=bugs
 * Returns saved views for the current user + shared views from same company.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const moduleName = request.nextUrl.searchParams.get("module") || "";
  if (!moduleName) return NextResponse.json({ error: "module param required" }, { status: 400 });

  const { company } = getAccessScope(user);

  try {
    const own = await db.query(
      `SELECT * FROM "ModuleView"
       WHERE "company" = ? AND "userId" = ? AND "module" = ? AND "deletedAt" IS NULL
       ORDER BY "isDefault" DESC, "name" ASC`,
      [company, user.id, moduleName],
    );

    const shared = await db.query(
      `SELECT * FROM "ModuleView"
       WHERE "company" = ? AND "userId" != ? AND "module" = ? AND "shared" = 1 AND "deletedAt" IS NULL
       ORDER BY "name" ASC`,
      [company, user.id, moduleName],
    );

    return NextResponse.json({ own, shared });
  } catch (error) {
    console.error("ModuleViews GET error:", error);
    return NextResponse.json({ error: "Failed to load views" }, { status: 500 });
  }
}

/**
 * POST /api/module-views
 * Body: { module, name, filters, search, viewMode, shared, isDefault }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const moduleName = String(body.module ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!moduleName || !name) {
    return NextResponse.json({ error: "module and name are required" }, { status: 400 });
  }
  if (name.length > 50) {
    return NextResponse.json({ error: "name must be 50 characters or fewer" }, { status: 400 });
  }

  const filters = JSON.stringify(body.filters ?? []);
  const search = String(body.search ?? "").trim();
  const viewMode = body.viewMode === "kanban" ? "kanban" : "table";
  const shared = body.shared ? 1 : 0;
  const isDefault = body.isDefault ? 1 : 0;

  const { company } = getAccessScope(user);
  const userName = user.name || user.email || `User ${user.id}`;

  try {
    // If setting as default, unset other defaults for this module
    if (isDefault) {
      await db.run(
        `UPDATE "ModuleView" SET "isDefault" = 0 WHERE "company" = ? AND "userId" = ? AND "module" = ? AND "deletedAt" IS NULL`,
        [company, user.id, moduleName],
      );
    }

    const publicToken = makePublicToken();

    await db.run(
      `INSERT INTO "ModuleView" ("company", "userId", "userName", "publicToken", "module", "name", "filters", "search", "viewMode", "shared", "isDefault")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company, user.id, userName, publicToken, moduleName, name, filters, search, viewMode, shared, isDefault],
    );

    const view = await db.get(
      `SELECT * FROM "ModuleView" WHERE "company" = ? AND "userId" = ? AND "module" = ? AND "name" = ? AND "deletedAt" IS NULL ORDER BY "id" DESC LIMIT 1`,
      [company, user.id, moduleName, name],
    );

    return NextResponse.json({ view });
  } catch (error) {
    console.error("ModuleViews POST error:", error);
    return NextResponse.json({ error: "Failed to create view" }, { status: 500 });
  }
}
