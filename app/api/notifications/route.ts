import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";

const notificationsCache = new Map<string, { expiresAt: number; payload: { notifications: { id: string; type: "overdue" | "deadline"; title: string; detail: string; href: string }[] } }>();

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = user.company || "";
  const isAdmin = isAdminUser(user.role, company);
  const cacheKey = `${company}|${isAdmin ? "admin" : "user"}`;
  const cached = notificationsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
  }
  const andCompany = isAdmin ? "" : ` AND "company" = ?`;
  const cp = isAdmin ? [] : [company];
  const todayIso = new Date().toISOString().slice(0, 10);
  const plus3Iso = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const plus2Iso = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const overdueExpr = `"createdAt" <= NOW() - INTERVAL '7 days'`;

  const notifications: { id: string; type: "overdue" | "deadline"; title: string; detail: string; href: string }[] = [];

  const [overdueBugs, deadlineSprints, deadlinePlans] = await Promise.all([
    db.query(
      `SELECT id, "publicToken", title, severity, "createdAt" FROM "Bug" WHERE status = 'open' AND ${overdueExpr}${andCompany} ORDER BY "createdAt" ASC LIMIT 10`,
      [...cp]
    ) as Promise<any[]>,
    db.query(
      `SELECT id, "publicToken", name, "endDate" FROM "Sprint"
       WHERE status != 'completed'
         AND status != 'closed'
         AND COALESCE("endDate", '') != ''
         AND "endDate" >= ?
         AND "endDate" <= ?
         ${andCompany}
       ORDER BY "endDate" ASC LIMIT 5`,
      [todayIso, plus3Iso, ...cp]
    ) as Promise<any[]>,
    db.query(
      `SELECT id, "publicToken", title, "endDate" FROM "TestPlan"
       WHERE status != 'closed'
         AND status != 'completed'
         AND "deletedAt" IS NULL
         AND COALESCE("endDate", '') != ''
         AND "endDate" >= ?
         AND "endDate" <= ?
         ${andCompany}
       ORDER BY "endDate" ASC LIMIT 5`,
      [todayIso, plus2Iso, ...cp]
    ) as Promise<any[]>,
  ]);

  for (const b of overdueBugs) {
    const days = Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 86400000);
    notifications.push({
      id: `bug-${b.id}`,
      type: "overdue",
      title: b.title,
      detail: `Bug open for ${days} days · ${b.severity}`,
      href: `/bugs?view=${b.publicToken || b.id}`,
    });
  }

  for (const s of deadlineSprints) {
    const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86400000);
    notifications.push({
      id: `sprint-${s.id}`,
      type: "deadline",
      title: s.name,
      detail: daysLeft === 0 ? "Sprint ends today!" : `Ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      href: `/sprints?view=${s.publicToken || s.id}`,
    });
  }

  for (const p of deadlinePlans) {
    const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / 86400000);
    notifications.push({
      id: `plan-${p.id}`,
      type: "deadline",
      title: p.title,
      detail: daysLeft === 0 ? "Test plan ends today!" : `Ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      href: `/test-plans?view=${p.publicToken || p.id}`,
    });
  }

  const payload = { notifications: notifications.slice(0, 15) };
  notificationsCache.set(cacheKey, { payload, expiresAt: Date.now() + 60000 });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
