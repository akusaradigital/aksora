import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Get audit logs
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const logs = await db.query<{
      id: number;
      actor: string;
      action: string;
      target: string;
      detail: string;
      createdAt: string;
    }>(
      `SELECT "id", "actor", "action", "target", "detail", "createdAt"
      FROM "AdminAuditLog"
      ORDER BY "createdAt" DESC
      LIMIT 50`
    );

    return NextResponse.json({ data: JSON.parse(JSON.stringify(logs)) });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
