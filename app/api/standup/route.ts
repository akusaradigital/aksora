import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { andWhere, params } = getAccessScope(user);

  try {
    // 1. Fetch user's tasks
    const tasks = await db.query<{ id: number; title: string; status: string; priority: string; project: string }>(
      `SELECT "id", "title", "status", "priority", "project" FROM "Task" WHERE "deletedAt" IS NULL ${andWhere} AND ("assignee" = ? OR "assignee" LIKE ?) ORDER BY "updatedAt" DESC LIMIT 15`,
      [...params, user.name || "", `%${user.email}%`]
    );

    // 2. Fetch user's active/open bugs
    const bugs = await db.query<{ id: number; title: string; severity: string; status: string; project: string }>(
      `SELECT "id", "title", "severity", "status", "project" FROM "Bug" WHERE "deletedAt" IS NULL ${andWhere} AND ("suggestedDev" = ? OR "suggestedDev" LIKE ?) ORDER BY "updatedAt" DESC LIMIT 15`,
      [...params, user.name || "", `%${user.email}%`]
    );

    // 3. Fetch recent meeting-notes with standup summary
    const recentStandups = await db.query<{ id: number; title: string; content: string; date: string; attendees: string }>(
      `SELECT "id", "title", "content", "date", "attendees" FROM "MeetingNote" WHERE "deletedAt" IS NULL AND ("title" LIKE '%Standup%' OR "content" LIKE '%Standup%') ${andWhere} ORDER BY "createdAt" DESC LIMIT 5`,
      params
    );

    return NextResponse.json({
      user: { name: user.name, email: user.email, role: user.role },
      tasks,
      bugs,
      recentStandups,
    });
  } catch (error) {
    console.error("Standup context fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch standup context" }, { status: 500 });
  }
}
