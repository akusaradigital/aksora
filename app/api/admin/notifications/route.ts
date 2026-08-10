import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Fetch notifications (with optional unread-only filter)
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);

  const whereClause = unreadOnly ? 'WHERE "read" = 0' : "";

  const notifications = await db.query<{
    id: number;
    type: string;
    title: string;
    message: string;
    companyId: number | null;
    companyName: string;
    meta: string;
    read: number;
    createdAt: string;
  }>(
    `SELECT "id", "type", "title", "message", "companyId", "companyName", "meta", "read", "createdAt"
    FROM "AdminNotification"
    ${whereClause}
    ORDER BY "createdAt" DESC
    LIMIT ?`,
    [limit]
  );

  const unreadCount = await db.get<{ count: number }>(
    `SELECT COUNT(*) as "count" FROM "AdminNotification" WHERE "read" = 0`
  );

  return NextResponse.json({
    data: JSON.parse(JSON.stringify(notifications)),
    unreadCount: Number(unreadCount?.count || 0),
  });
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    action?: "read" | "read_all";
    id?: number;
  } | null;

  if (!body?.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  if (body.action === "read_all") {
    await db.run('UPDATE "AdminNotification" SET "read" = 1 WHERE "read" = 0');
  } else if (body.action === "read" && body.id) {
    await db.run(
      'UPDATE "AdminNotification" SET "read" = 1 WHERE "id" = CAST(? AS INTEGER)',
      [body.id]
    );
  }

  return NextResponse.json({ ok: true });
}
