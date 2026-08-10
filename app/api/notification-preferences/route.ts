import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";

type Preferences = {
  assignedToMe: boolean;
  statusChanges: boolean;
  mentions: boolean;
  overdueBugs: boolean;
  sprintDeadlines: boolean;
  dailyDigest: boolean;
};

const DEFAULT_PREFS: Preferences = {
  assignedToMe: true,
  statusChanges: true,
  mentions: true,
  overdueBugs: true,
  sprintDeadlines: true,
  dailyDigest: true,
};

/**
 * GET /api/notification-preferences
 * Returns the current user's notification preferences.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const row = await db.get<Record<string, number>>(
      `SELECT "assignedToMe", "statusChanges", "mentions", "overdueBugs", "sprintDeadlines", "dailyDigest"
       FROM "NotificationPreference"
       WHERE "userId" = ?`,
      [user.id],
    );

    if (!row) {
      return NextResponse.json({ preferences: DEFAULT_PREFS });
    }

    const preferences: Preferences = {
      assignedToMe: row.assignedToMe === 1,
      statusChanges: row.statusChanges === 1,
      mentions: row.mentions === 1,
      overdueBugs: row.overdueBugs === 1,
      sprintDeadlines: row.sprintDeadlines === 1,
      dailyDigest: row.dailyDigest === 1,
    };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("NotificationPreferences GET error:", error);
    return NextResponse.json({ preferences: DEFAULT_PREFS });
  }
}

/**
 * PUT /api/notification-preferences
 * Updates the current user's notification preferences (upsert).
 */
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<Preferences>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { company } = getAccessScope(user);

  const prefs = {
    assignedToMe: body.assignedToMe !== false ? 1 : 0,
    statusChanges: body.statusChanges !== false ? 1 : 0,
    mentions: body.mentions !== false ? 1 : 0,
    overdueBugs: body.overdueBugs !== false ? 1 : 0,
    sprintDeadlines: body.sprintDeadlines !== false ? 1 : 0,
    dailyDigest: body.dailyDigest !== false ? 1 : 0,
  };

  try {
    const existing = await db.get(
      `SELECT "id" FROM "NotificationPreference" WHERE "userId" = ?`,
      [user.id],
    );

    if (existing) {
      await db.run(
        `UPDATE "NotificationPreference"
         SET "assignedToMe" = ?, "statusChanges" = ?, "mentions" = ?, "overdueBugs" = ?, "sprintDeadlines" = ?, "dailyDigest" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = ?`,
        [prefs.assignedToMe, prefs.statusChanges, prefs.mentions, prefs.overdueBugs, prefs.sprintDeadlines, prefs.dailyDigest, user.id],
      );
    } else {
      await db.run(
        `INSERT INTO "NotificationPreference" ("company", "userId", "assignedToMe", "statusChanges", "mentions", "overdueBugs", "sprintDeadlines", "dailyDigest")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [company, user.id, prefs.assignedToMe, prefs.statusChanges, prefs.mentions, prefs.overdueBugs, prefs.sprintDeadlines, prefs.dailyDigest],
      );
    }

    return NextResponse.json({ success: true, preferences: {
      assignedToMe: prefs.assignedToMe === 1,
      statusChanges: prefs.statusChanges === 1,
      mentions: prefs.mentions === 1,
      overdueBugs: prefs.overdueBugs === 1,
      sprintDeadlines: prefs.sprintDeadlines === 1,
      dailyDigest: prefs.dailyDigest === 1,
    }});
  } catch (error) {
    console.error("NotificationPreferences PUT error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
