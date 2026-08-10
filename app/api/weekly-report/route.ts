import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";
import { codeFromId } from "@/lib/utils";

type CountRow = { count: number | string };
type SeverityRow = { name: string | null; count: number | string };
type ProjectRow = { name: string; count: number | string };
type AssigneeRow = { name: string; taskCount: number | string };

type BugRow = {
  id: number;
  title: string;
  severity: string;
  priority: string;
  project: string;
  status: string;
};

type ClosedBugRow = {
  id: number;
  title: string;
  severity: string;
};

type TaskRow = {
  id: number;
  title: string;
  priority: string;
  status: string;
  project: string;
};

type SessionRow = {
  id: number;
  date: string;
  tester: string;
  scope: string;
  totalCases: number | string;
  passed: number | string;
  failed: number | string;
  blocked: number | string;
  result: string;
};

type SprintRow = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  goal: string;
};

type ActivityRow = {
  entityType: string;
  action: string;
  summary: string;
  createdAt: string;
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);
  const andCompany = isAdmin ? "" : ` AND "company" = ?`;
  const cp: unknown[] = isAdmin ? [] : [company];

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let fromDate: string;
  let toDate: string;

  if (fromParam && toParam) {
    fromDate = fromParam;
    toDate = toParam;
  } else {
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    fromDate = toDateStr(monday);
    toDate = toDateStr(sunday);
  }

  const dp = [fromDate, toDate]; // date params

  const [
    newBugs,
    closedBugs,
    openBugs,
    newTasks,
    doneTasks,
    openTasks,
    sessions,
    testCasesRun,
    bugsBySeverity,
    bugsByProject,
    topAssignees,
    activeSprints,
    recentActivity,
  ] = await Promise.all([
    db.query<BugRow>(
      `SELECT id, title, severity, priority, project, status
       FROM "Bug"
       WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY "createdAt" DESC`,
      [...dp, ...cp],
    ),
    db.query<ClosedBugRow>(
      `SELECT id, title, severity
       FROM "Bug"
       WHERE status IN ('closed','fixed') AND date("updatedAt") >= ? AND date("updatedAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count
       FROM "Bug"
       WHERE status = 'open' AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<TaskRow>(
      `SELECT id, title, priority, status, project
       FROM "Task"
       WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY "createdAt" DESC`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count
       FROM "Task"
       WHERE status = 'done' AND date("updatedAt") >= ? AND date("updatedAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count
       FROM "Task"
       WHERE status != 'done' AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<SessionRow>(
      `SELECT id, date, tester, scope, "totalCases", passed, failed, blocked, result
       FROM "TestSession"
       WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY date DESC`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count
       FROM "TestCase"
       WHERE date("updatedAt") >= ? AND date("updatedAt") <= ? AND status != 'Pending'${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<SeverityRow>(
      `SELECT COALESCE(NULLIF(severity, ''), 'unknown') as name, COUNT(*) as count
       FROM "Bug"
       WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       GROUP BY COALESCE(NULLIF(severity, ''), 'unknown')
       ORDER BY count DESC`,
      [...dp, ...cp],
    ),
    db.query<ProjectRow>(
      `SELECT project as name, COUNT(*) as count
       FROM "Bug"
       WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       GROUP BY project
       ORDER BY count DESC
       LIMIT 5`,
      [...dp, ...cp],
    ),
    db.query<AssigneeRow>(
      `
      SELECT name, SUM(taskCount) as taskCount
      FROM (
        SELECT assignee as name, COUNT(*) as taskCount
        FROM "Task"
        WHERE assignee != '' AND date("updatedAt") >= ? AND date("updatedAt") <= ?${andCompany}
        GROUP BY assignee
        UNION ALL
        SELECT "suggestedDev" as name, COUNT(*) as taskCount
        FROM "Bug"
        WHERE "suggestedDev" != '' AND date("updatedAt") >= ? AND date("updatedAt") <= ?${andCompany}
        GROUP BY "suggestedDev"
      ) as combined
      GROUP BY name
      ORDER BY taskCount DESC
      LIMIT 5
      `,
      [...dp, ...cp, ...dp, ...cp],
    ),
    db.query<SprintRow>(
      `SELECT id, name, "startDate", "endDate", status, goal
       FROM "Sprint"
       WHERE COALESCE("startDate",'') != '' AND "startDate" <= ? AND COALESCE("endDate","startDate") >= ?${andCompany}
       LIMIT 5`,
      [toDate, fromDate, ...cp],
    ),
    db.query<ActivityRow>(
      `SELECT "entityType", action, summary, "createdAt"
       FROM "ActivityLog"
       WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY "createdAt" DESC
       LIMIT 20`,
      [...dp, ...cp],
    ),
  ]);

  const totalSessionPassed = sessions.reduce((sum, row) => sum + Number(row.passed ?? 0), 0);
  const totalSessionCases = sessions.reduce((sum, row) => sum + Number(row.totalCases ?? 0), 0);

  return NextResponse.json({
    period: {
      from: fromDate,
      to: toDate,
    },
    summary: {
      newBugs: newBugs.length,
      closedBugs: closedBugs.length,
      openBugs: Number(openBugs[0]?.count ?? 0),
      newTasks: newTasks.length,
      doneTasks: Number(doneTasks[0]?.count ?? 0),
      openTasks: Number(openTasks[0]?.count ?? 0),
      sessions: sessions.length,
      testCasesRun: Number(testCasesRun[0]?.count ?? 0),
      passRate: totalSessionCases > 0 ? Math.round((totalSessionPassed / totalSessionCases) * 100) : null,
    },
    newBugs: newBugs.map((bug) => ({
      id: bug.id,
      code: codeFromId("BUG", Number(bug.id)),
      title: bug.title,
      severity: bug.severity,
      priority: bug.priority,
      project: bug.project,
      status: bug.status,
    })),
    closedBugs: closedBugs.map((bug) => ({
      id: bug.id,
      code: codeFromId("BUG", Number(bug.id)),
      title: bug.title,
      severity: bug.severity,
    })),
    newTasks: newTasks.map((task) => ({
      id: task.id,
      code: codeFromId("TASK", Number(task.id)),
      title: task.title,
      priority: task.priority,
      status: task.status,
      project: task.project,
    })),
    bugsBySeverity: bugsBySeverity.map((row) => ({
      name: row.name ?? "unknown",
      count: Number(row.count ?? 0),
    })),
    bugsByProject: bugsByProject.map((row) => ({
      name: row.name,
      count: Number(row.count ?? 0),
    })),
    topAssignees: topAssignees.map((row) => ({
      name: row.name,
      count: Number(row.taskCount ?? 0),
    })),
    activeSprints,
    sessions: sessions.map((session) => ({
      id: session.id,
      date: session.date,
      tester: session.tester,
      scope: session.scope,
      totalCases: Number(session.totalCases ?? 0),
      passed: Number(session.passed ?? 0),
      failed: Number(session.failed ?? 0),
      blocked: Number(session.blocked ?? 0),
      result: session.result,
    })),
    recentActivity: recentActivity.map((activity) => ({
      entityType: activity.entityType,
      action: activity.action,
      summary: activity.summary,
      createdAt: activity.createdAt,
    })),
  });
}


