import { db } from "@/lib/db";
import { codeFromId } from "@/lib/utils";

// System-context weekly report builder (no getCurrentUser) — used by the cron
// route to generate per-company digests. Mirrors the queries in
// app/api/weekly-report/route.ts but scoped to an explicit company.

type CountRow = { count: number | string };
type BugRow = { id: number; title: string; severity: string; priority: string; project: string; status: string };
type TaskRow = { id: number; title: string; priority: string; status: string; project: string };
type SessionRow = {
  id: number; date: string; tester: string; scope: string;
  totalCases: number | string; passed: number | string; failed: number | string;
  blocked: number | string; result: string;
};
type ActivityRow = { entityType: string; action: string; summary: string; createdAt: string };

export type WeeklyDigest = {
  company: string;
  period: { from: string; to: string };
  summary: {
    newBugs: number; closedBugs: number; openBugs: number;
    newTasks: number; doneTasks: number; openTasks: number;
    sessions: number; testCasesRun: number; passRate: number | null;
  };
  newBugs: Array<{ code: string; title: string; severity: string; status: string }>;
  closedBugs: Array<{ code: string; title: string; severity: string }>;
  newTasks: Array<{ code: string; title: string; priority: string; status: string }>;
  recentActivity: Array<{ entityType: string; action: string; summary: string; createdAt: string }>;
};

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getWeeklyDigestForCompany(company: string, from: string, to: string): Promise<WeeklyDigest | null> {
  const andCompany = ` AND "company" = ?`;
  const cp: unknown[] = [company];
  const dp = [from, to];

  const [
    newBugs,
    closedBugs,
    openBugs,
    newTasks,
    doneTasks,
    openTasks,
    sessions,
    testCasesRun,
    recentActivity,
  ] = await Promise.all([
    db.query<BugRow>(
      `SELECT id, title, severity, priority, project, status
       FROM "Bug" WHERE "deletedAt" IS NULL AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY "createdAt" DESC`,
      [...dp, ...cp],
    ),
    db.query<BugRow>(
      `SELECT id, title, severity, priority, project, status
       FROM "Bug" WHERE "deletedAt" IS NULL AND status IN ('closed','fixed') AND date("updatedAt") >= ? AND date("updatedAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM "Bug" WHERE "deletedAt" IS NULL AND status = 'open' AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<TaskRow>(
      `SELECT id, title, priority, status, project
       FROM "Task" WHERE "deletedAt" IS NULL AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY "createdAt" DESC`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM "Task" WHERE "deletedAt" IS NULL AND status = 'done' AND date("updatedAt") >= ? AND date("updatedAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM "Task" WHERE "deletedAt" IS NULL AND status != 'done' AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<SessionRow>(
      `SELECT id, date, tester, scope, "totalCases", passed, failed, blocked, result
       FROM "TestSession" WHERE "deletedAt" IS NULL AND date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY date DESC`,
      [...dp, ...cp],
    ),
    db.query<CountRow>(
      `SELECT COUNT(*) as count FROM "TestCase" WHERE "deletedAt" IS NULL AND date("updatedAt") >= ? AND date("updatedAt") <= ? AND status != 'Pending'${andCompany}`,
      [...dp, ...cp],
    ),
    db.query<ActivityRow>(
      `SELECT "entityType", action, summary, "createdAt"
       FROM "ActivityLog" WHERE date("createdAt") >= ? AND date("createdAt") <= ?${andCompany}
       ORDER BY "createdAt" DESC LIMIT 15`,
      [...dp, ...cp],
    ),
  ]);

  const totalSessionPassed = sessions.reduce((sum, row) => sum + Number(row.passed ?? 0), 0);
  const totalSessionCases = sessions.reduce((sum, row) => sum + Number(row.totalCases ?? 0), 0);

  return {
    company,
    period: { from, to },
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
    newBugs: newBugs.map((b) => ({ code: codeFromId("BUG", Number(b.id)), title: b.title, severity: b.severity, status: b.status })),
    closedBugs: closedBugs.map((b) => ({ code: codeFromId("BUG", Number(b.id)), title: b.title, severity: b.severity })),
    newTasks: newTasks.map((t) => ({ code: codeFromId("TASK", Number(t.id)), title: t.title, priority: t.priority, status: t.status })),
    recentActivity: recentActivity.map((a) => ({ entityType: a.entityType, action: a.action, summary: a.summary, createdAt: a.createdAt })),
  };
}

export function renderDigestHtml(digest: WeeklyDigest): string {
  const { summary, period } = digest;
  const sevColor: Record<string, string> = { critical: "#dc2626", high: "#f97316", medium: "#facc15", low: "#0ea5e9" };

  const bugRows = digest.newBugs
    .map((b) => `<tr><td><b>${b.code}</b></td><td>${b.title}</td><td style="color:${sevColor[b.severity] ?? "#333"}">${b.severity || "-"}</td><td>${b.status || "-"}</td></tr>`)
    .join("");
  const taskRows = digest.newTasks
    .map((t) => `<tr><td><b>${t.code}</b></td><td>${t.title}</td><td>${t.priority || "-"}</td><td>${t.status || "-"}</td></tr>`)
    .join("");
  const activityList = digest.recentActivity
    .slice(0, 8)
    .map((a) => `<li>${a.summary}</li>`)
    .join("");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">
    <h2 style="margin-bottom:4px">Aksora — Weekly Report</h2>
    <p style="color:#666;margin-top:0">${period.from} → ${period.to} · ${digest.company}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        ${[
          ["New Bugs", summary.newBugs],
          ["Closed", summary.closedBugs],
          ["Open Bugs", summary.openBugs],
          ["New Tasks", summary.newTasks],
          ["Done Tasks", summary.doneTasks],
          ["Sessions", summary.sessions],
          ["Pass Rate", summary.passRate === null ? "-" : `${summary.passRate}%`],
        ]
          .map(
            ([label, value]) =>
              `<td style="border:1px solid #e5e7eb;padding:10px;text-align:center"><div style="font-size:22px;font-weight:bold">${value}</div><div style="font-size:12px;color:#666">${label}</div></td>`,
          )
          .join("")}
      </tr>
    </table>

    ${bugRows ? `<h3>New Bugs (${digest.newBugs.length})</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${bugRows}</table>` : ""}
    ${taskRows ? `<h3>New Tasks (${digest.newTasks.length})</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${taskRows}</table>` : ""}
    ${activityList ? `<h3>Recent Activity</h3><ul style="font-size:14px">${activityList}</ul>` : ""}

    <p style="margin-top:24px;font-size:12px;color:#999">
      Generated by Aksora · by Akusara Digital. Manage notifications in Settings → Notifications.
    </p>
  </div>`;
}