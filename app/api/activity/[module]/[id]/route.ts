import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";
import { getTableName } from "@/lib/data-helpers";
import type { ModuleKey } from "@/lib/modules";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ module: string; id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { module, id } = await params;
  const company = String(user.company ?? "").trim();
  const isAdmin = isAdminUser(user.role, company);
  const andCompany = isAdmin ? "" : ` AND "company" = ?`;
  const cp = isAdmin ? [] : [company];

  const entityType = getTableName(module as ModuleKey);
  if (!entityType) {
    return NextResponse.json({ entries: [] });
  }

  try {
    const entries = await db.query(
      `SELECT "id", "action", "summary", "actor", "publicToken", "createdAt"
       FROM "ActivityLog"
       WHERE "entityType" = ? AND "entityId" = ?${andCompany}
       ORDER BY "createdAt" DESC
       LIMIT 50`,
      [module, id, ...cp],
    );

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
