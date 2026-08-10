import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, getTableName } from "@/lib/data-helpers";
import { moduleOrder, type ModuleKey } from "@/lib/modules";

export const dynamic = "force-dynamic";

// GET /api/resolve-view?module=tasks&id=123
// Returns { publicToken: "abc123..." } or 404
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const moduleKey = request.nextUrl.searchParams.get("module") || "";
  const id = request.nextUrl.searchParams.get("id") || "";

  if (!moduleKey || !moduleOrder.includes(moduleKey as ModuleKey)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }

  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { company, isAdmin } = getAccessScope(user);
  const table = getTableName(moduleKey as ModuleKey);
  if (!table) return NextResponse.json({ error: "Invalid module" }, { status: 400 });

  const companyFilter = isAdmin ? "" : ' AND "company" = ?';
  const params: unknown[] = isAdmin ? [numId] : [numId, company];

  const row = await db.get<{ publicToken: string }>(
    `SELECT "publicToken" FROM "${table}" WHERE "id" = ? AND "deletedAt" IS NULL${companyFilter}`,
    params,
  );

  if (!row || !row.publicToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ publicToken: row.publicToken });
}
