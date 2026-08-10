import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { createAdminNotification } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

// Get tickets for the current company (admin only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isWorkspaceAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = String(user.company || "").trim();
  if (!company) {
    return NextResponse.json({ data: [] });
  }

  const tickets = await db.query<{
    id: number;
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
    `SELECT "id", "subject", "message", "category", "status", "priority",
      "createdBy", "adminReply", "repliedAt", "closedAt", "createdAt"
    FROM "SupportTicket"
    WHERE "company" = ?
    ORDER BY "createdAt" DESC
    LIMIT 20`,
    [company]
  );

  return NextResponse.json({ data: JSON.parse(JSON.stringify(tickets)) });
}

// Create a new ticket (admin only)
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isWorkspaceAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = String(user.company || "").trim();
  if (!company) {
    return NextResponse.json({ error: "No company associated" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as {
    subject?: string;
    message?: string;
    category?: string;
    priority?: string;
  } | null;

  const subject = body?.subject?.trim() || "";
  const message = body?.message?.trim() || "";
  const category = body?.category || "general";
  const priority = body?.priority || "normal";

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const validCategories = ["general", "billing", "technical", "feature-request"];
  const validPriorities = ["low", "normal", "high", "urgent"];

  await db.run(
    `INSERT INTO "SupportTicket" ("company", "subject", "message", "category", "status", "priority", "createdBy")
    VALUES (?, ?, ?, ?, 'open', ?, ?)`,
    [company, subject, message, validCategories.includes(category) ? category : "general", validPriorities.includes(priority) ? priority : "normal", user.name || user.email]
  );

  // Notify superadmin
  await createAdminNotification({
    type: "new_ticket",
    title: `New ticket: ${subject}`,
    message: `From ${company} (${user.name || user.email}) — ${priority} priority`,
    companyName: company,
    meta: { category, priority },
  });

  return NextResponse.json({ ok: true });
}
