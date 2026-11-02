import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { andWhere, params } = getAccessScope(user);
  const todayIso = new Date().toISOString().slice(0, 10);
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  try {
    // 1. Bugs verified / touched today
    const bugs = await db.query<{
      id: number | string;
      title: string;
      project: string;
      severity: string;
      status: string;
      updatedAt: string;
      suggestedDev?: string;
    }>(
      `SELECT "id", "title", "project", "severity", "status", "updatedAt", "suggestedDev"
       FROM "Bug"
       WHERE "deletedAt" IS NULL ${andWhere}
         AND ("createdAt" >= ? OR "updatedAt" >= ?)
       ORDER BY "updatedAt" DESC
       LIMIT 20`,
      [...params, startOfDayIso, startOfDayIso]
    );

    // 2. Test sessions run today
    const testSessions = await db.query<{
      id: number | string;
      project: string;
      tester: string;
      scope: string;
      totalCases: string;
      passed: string;
      failed: string;
      blocked: string;
      result: string;
      date: string;
    }>(
      `SELECT "id", "project", "tester", "scope", "totalCases", "passed", "failed", "blocked", "result", "date"
       FROM "TestSession"
       WHERE "deletedAt" IS NULL ${andWhere}
         AND ("date" = ? OR "date" LIKE ? OR "createdAt" >= ?)
       ORDER BY "createdAt" DESC
       LIMIT 10`,
      [...params, todayIso, `${todayIso}%`, startOfDayIso]
    );

    // 3. Standup notes / meeting notes today
    const standupNotes = await db.query<{
      id: number | string;
      title: string;
      project: string;
      content: string;
      actionItems: string;
      date: string;
    }>(
      `SELECT "id", "title", "project", "content", "actionItems", "date"
       FROM "MeetingNote"
       WHERE "deletedAt" IS NULL ${andWhere}
         AND ("date" = ? OR "date" LIKE ? OR "createdAt" >= ? OR LOWER("title") LIKE '%standup%')
       ORDER BY "createdAt" DESC
       LIMIT 10`,
      [...params, todayIso, `${todayIso}%`, startOfDayIso]
    );

    // 4. Existing today's work logs
    const todayLogs = await db.query<{
      id: number | string;
      project: string;
      category: string;
      description: string;
      output: string;
      durationMinutes: number | string;
      date: string;
      assignee?: string;
    }>(
      `SELECT "id", "project", "category", "description", "output", "durationMinutes", "date", "assignee"
       FROM "WorkLog"
       WHERE "deletedAt" IS NULL ${andWhere}
         AND ("date" = ? OR "date" LIKE ?)
       ORDER BY "createdAt" ASC`,
      [...params, todayIso, `${todayIso}%`]
    );

    // Build suggested work log items
    const suggestions: Array<{
      date: string;
      project: string;
      category: string;
      description: string;
      output: string;
      durationMinutes: number;
    }> = [];

    for (const session of testSessions) {
      const passInfo = session.passed ? `${session.passed} passed` : "";
      const failInfo = session.failed && session.failed !== "0" ? `, ${session.failed} failed` : "";
      const statSummary = passInfo ? ` (${passInfo}${failInfo})` : "";
      suggestions.push({
        date: todayIso,
        project: session.project || "QA Testing",
        category: "testing",
        description: `Executed test session: ${session.scope || "Functional verification"}${statSummary}`,
        output: `Outcome: ${session.result || "Completed"} - ${session.totalCases || 0} cases evaluated`,
        durationMinutes: 120,
      });
    }

    for (const bug of bugs) {
      const isResolved = ["closed", "fixed", "ready_to_retest"].includes(String(bug.status || "").toLowerCase());
      suggestions.push({
        date: todayIso,
        project: bug.project || "QA Testing",
        category: "bugfix",
        description: `${isResolved ? "Verified defect" : "Triaged bug"}: ${bug.title} [${bug.severity || "Normal"}]`,
        output: `Defect status: ${bug.status || "Open"} - verified in test environment`,
        durationMinutes: 45,
      });
    }

    for (const note of standupNotes) {
      suggestions.push({
        date: todayIso,
        project: note.project || "General",
        category: "meeting",
        description: `Daily standup sync: ${note.title}`,
        output: note.actionItems ? `Action items: ${note.actionItems}` : "Synced blockers and QA priorities with engineering team",
        durationMinutes: 30,
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        date: todayIso,
        project: "QA Ecosystem",
        category: "testing",
        description: "Test execution, defect verification, and regression passes",
        output: "Test suite execution completed and verified in test environment",
        durationMinutes: 120,
      });
    }

    return NextResponse.json({
      data: {
        date: todayIso,
        activities: {
          bugs,
          testSessions,
          standupNotes,
        },
        suggestions,
        todayLogs,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/work-logs/today-activity:", error);
    return NextResponse.json({ error: "Failed to load today's activities" }, { status: 500 });
  }
}
