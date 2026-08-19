import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/auth-core";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

type NotificationItem = { id: string; type: "overdue" | "deadline"; title: string; detail: string; href: string; workspace: string };

const notificationsCache = new Map<string, { expiresAt: number; payload: { notifications: NotificationItem[] } }>();

type OverdueBugRow = {
  id: string;
  publicToken: string | null;
  title: string;
  severity: string | null;
  createdAt: string | Date;
};

type SprintDeadlineRow = {
  id: string;
  publicToken: string | null;
  name: string;
  endDate: string | Date;
};

type TestPlanDeadlineRow = {
  id: string;
  publicToken: string | null;
  title: string;
  endDate: string | Date;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  const workspaces = memberships.map((item) => item.name).filter(Boolean);
  const company = user.company || "";
  const isAdmin = isPlatformSuperAdmin(user.role, company);
  const cacheKey = `${workspaces.join(",")}|${isAdmin ? "admin" : "user"}`;
  const cached = notificationsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
  }
  const andCompany = isAdmin ? "" : ` AND "company" = ANY(?::text[])`;
  const cp = isAdmin ? [] : [workspaces];
  const todayIso = new Date().toISOString().slice(0, 10);
  const plus3Iso = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const plus2Iso = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const overdueExpr = `"createdAt" <= NOW() - INTERVAL '7 days'`;

  const notifications: NotificationItem[] = [];

  const [overdueBugs, deadlineSprints, deadlinePlans] = await Promise.all([
    db.query<any>(
      `SELECT id, "publicToken", title, severity, "createdAt", "company" FROM "Bug" WHERE status = 'open' AND ${overdueExpr}${andCompany} ORDER BY "createdAt" ASC LIMIT 10`,
      isAdmin ? [] : [workspaces],
    ),
    db.query<any>(
      `SELECT id, "publicToken", name, "endDate", "company" FROM "Sprint"
       WHERE status != 'completed'
         AND status != 'closed'
         AND COALESCE("endDate", '') != ''
         AND "endDate" >= ?
         AND "endDate" <= ?
         ${andCompany}
       ORDER BY "endDate" ASC LIMIT 5`,
      isAdmin ? [todayIso, plus3Iso] : [todayIso, plus3Iso, workspaces],
    ),
    db.query<any>(
      `SELECT id, "publicToken", title, "endDate", "company" FROM "TestPlan"
       WHERE status != 'closed'
         AND status != 'completed'
         AND "deletedAt" IS NULL
         AND COALESCE("endDate", '') != ''
         AND "endDate" >= ?
         AND "endDate" <= ?
         ${andCompany}
       ORDER BY "endDate" ASC LIMIT 5`,
      isAdmin ? [todayIso, plus2Iso] : [todayIso, plus2Iso, workspaces],
    ),
  ]);

  for (const b of overdueBugs) {
    const days = Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 86400000);
    notifications.push({
      id: `bug-${b.id}`,
      type: "overdue",
      title: b.title,
      detail: `Bug open for ${days} days · ${b.severity}`,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(b.company || "")}&to=${encodeURIComponent(`/bugs?view=${b.publicToken || b.id}`)}`,
      workspace: b.company || "",
    });
  }

  for (const s of deadlineSprints) {
    const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86400000);
    notifications.push({
      id: `sprint-${s.id}`,
      type: "deadline",
      title: s.name,
      detail: daysLeft === 0 ? "Sprint ends today!" : `Ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(s.company || "")}&to=${encodeURIComponent(`/sprints?view=${s.publicToken || s.id}`)}`,
      workspace: s.company || "",
    });
  }

  for (const p of deadlinePlans) {
    const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
    notifications.push({
      id: `plan-${p.id}`,
      type: "deadline",
      title: p.title,
      detail: daysLeft === 0 ? "Test plan ends today!" : `Ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(p.company || "")}&to=${encodeURIComponent(`/test-plans?view=${p.publicToken || p.id}`)}`,
      workspace: p.company || "",
    });
  }

  const payload = { notifications: notifications.slice(0, 15) };
  notificationsCache.set(cacheKey, { payload, expiresAt: Date.now() + 60000 });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
