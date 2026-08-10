import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Get all announcements
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const announcements = await db.query<{
      id: number;
      title: string;
      message: string;
      type: string;
      targetCompany: string;
      active: number;
      createdBy: string;
      expiresAt: string | null;
      createdAt: string;
    }>(
      `SELECT "id", "title", "message", "type", "targetCompany", "active", "createdBy", "expiresAt", "createdAt"
      FROM "Announcement"
      ORDER BY "createdAt" DESC
      LIMIT 30`
    );

    return NextResponse.json({ data: JSON.parse(JSON.stringify(announcements)) });
  } catch (error) {
    console.error("Announcements error:", error);
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

// Create announcement
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, message, type, targetCompany, expiresAt } = body as {
      title?: string;
      message?: string;
      type?: string;
      targetCompany?: string;
      expiresAt?: string;
    };

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const validTypes = ["info", "warning", "maintenance", "update"];
    const announcementType = validTypes.includes(type || "") ? type : "info";

    await db.run(
      `INSERT INTO "Announcement" ("title", "message", "type", "targetCompany", "active", "createdBy", "expiresAt")
      VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [title.trim(), message.trim(), announcementType, targetCompany?.trim() || "", user.name || user.email, expiresAt || null]
    );

    // Log to audit
    await db.run(
      `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
      [user.name || user.email, "create_announcement", targetCompany?.trim() || "all", `"${title.trim()}" (${announcementType})`]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Create announcement error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

// Toggle/delete announcement
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, action } = body as { id: number; action: "deactivate" | "activate" | "delete" };

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    if (action === "delete") {
      await db.run('DELETE FROM "Announcement" WHERE "id" = CAST(? AS INTEGER)', [id]);
    } else {
      const newActive = action === "activate" ? 1 : 0;
      await db.run(
        'UPDATE "Announcement" SET "active" = CAST(? AS INTEGER) WHERE "id" = CAST(? AS INTEGER)',
        [newActive, id]
      );
    }

    await db.run(
      `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
      [user.name || user.email, `${action}_announcement`, `announcement #${id}`, ""]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Patch announcement error:", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
