import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/auth-core";
import { codeFromId } from "@/lib/utils";
import { logger } from "@/lib/logger";

// Items stuck in a status for too long
const THRESHOLDS: Record<string, number> = {
  ready_to_retest: 3,  // 3 days
  in_progress: 7,      // 7 days
  doing: 7,
  open: 10,            // 10 days
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const company = user.company || "";
    const isAdmin = isAdminUser(user.role, company);
    const andCompany = isAdmin ? "" : ` AND "company" = ?`;
    const cp = isAdmin ? [] : [company];

    const staleStatuses = Object.keys(THRESHOLDS);
    const placeholders = staleStatuses.map(() => "?").join(", ");
    const thresholdCase = `CASE LOWER(COALESCE(status, ''))
      ${staleStatuses.map((status) => `WHEN '${status}' THEN ${THRESHOLDS[status]}`).join(" ")}
      ELSE 0 END`;

    const dayExpr = `(CURRENT_DATE - "updatedAt"::date)`;

    const [bugRows, taskRows] = await Promise.all([
      db.query<{
        id: number | string;
        title: string;
        status: string;
        days: number | string;
      }>(
        `SELECT id, title, status,
          ${dayExpr} as days
         FROM "Bug"
         WHERE LOWER(COALESCE(status, '')) IN (${placeholders})${andCompany}
           AND ${dayExpr} >= ${thresholdCase}
         ORDER BY days DESC, "updatedAt" ASC
         LIMIT 15`,
        [...staleStatuses, ...cp],
      ),
      db.query<{
        id: number | string;
        title: string;
        status: string;
        days: number | string;
      }>(
        `SELECT id, title, status,
          ${dayExpr} as days
         FROM "Task"
         WHERE LOWER(COALESCE(status, '')) IN (${placeholders})${andCompany}
           AND ${dayExpr} >= ${thresholdCase}
         ORDER BY days DESC, "updatedAt" ASC
         LIMIT 15`,
        [...staleStatuses, ...cp],
      ),
    ]);

    const mapped = [
      ...bugRows.map((r) => ({
        id: `bug-${r.id}`,
        code: codeFromId("BUG", Number(r.id)),
        title: r.title,
        module: "Bug",
        status: r.status,
        days: Number(r.days ?? 0),
        href: "/bugs",
      })),
      ...taskRows.map((r) => ({
        id: `task-${r.id}`,
        code: codeFromId("TASK", Number(r.id)),
        title: r.title,
        module: "Task",
        status: r.status,
        days: Number(r.days ?? 0),
        href: "/tasks",
      })),
    ];

    mapped.sort((a, b) => b.days - a.days);

    return NextResponse.json(
      { bottlenecks: mapped.slice(0, 15) },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    logger.apiError("/api/bottlenecks", error, { company: user.company, userId: user.id });
    return NextResponse.json({ bottlenecks: [] }, { status: 200 });
  }
}
