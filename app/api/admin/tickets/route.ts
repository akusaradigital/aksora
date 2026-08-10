import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Get all tickets (superadmin)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await db.query<{
    id: number;
    company: string;
    subject: string;
    message: string;
    category: string;
    status: string;
    priority: string;
    createdBy: string;
    adminReply: string;
    repliedAt: string | null;
    closedAt: string | null;
    createdAt: string;
  }>(
    `SELECT "id", "company", "subject", "message", "category", "status", "priority",
      "createdBy", "adminReply", "repliedAt", "closedAt", "createdAt"
    FROM "SupportTicket"
    ORDER BY
      CASE "status" WHEN 'open' THEN 0 WHEN 'in-progress' THEN 1 ELSE 2 END,
      CASE "priority" WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      "createdAt" DESC
    LIMIT 50`
  );

  return NextResponse.json({ data: JSON.parse(JSON.stringify(tickets)) });
}

// Reply/close ticket (superadmin)
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    id?: number;
    action?: "reply" | "close" | "in-progress";
    reply?: string;
  } | null;

  const id = body?.id;
  const action = body?.action;

  if (!id || !action) {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  switch (action) {
    case "reply":
      const reply = body?.reply?.trim() || "";
      if (!reply) {
        return NextResponse.json({ error: "Reply message is required" }, { status: 400 });
      }
      await db.run(
        `UPDATE "SupportTicket" SET "adminReply" = ?, "repliedAt" = CURRENT_TIMESTAMP, "status" = 'replied', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
        [reply, id]
      );
      break;

    case "close":
      await db.run(
        `UPDATE "SupportTicket" SET "status" = 'closed', "closedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
        [id]
      );
      break;

    case "in-progress":
      await db.run(
        `UPDATE "SupportTicket" SET "status" = 'in-progress', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
        [id]
      );
      break;

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Audit log
  await db.run(
    `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
    [user.name || user.email, `ticket_${action}`, `ticket #${id}`, body?.reply?.slice(0, 50) || ""]
  );

  return NextResponse.json({ ok: true });
}
