import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { hasCapability } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

const GROUP_SQL = {
  feature: `COALESCE(NULLIF("feature", ''), 'unknown')`,
  model: `COALESCE(NULLIF("model", ''), 'unknown')`,
  day: `TO_CHAR("createdAt", 'YYYY-MM-DD')`,
} as const;

type Row = { key: string; calls: number; tokens: number; failures: number; avgDurationMs: number };

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = getAccessScope(user);
  if (!scope.isAdmin && !(await hasCapability(user, "ai.usage.view"))) {
    return NextResponse.json({ error: "You do not have permission to view AI usage." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const to = sp.get("to") ? new Date(`${sp.get("to")}T23:59:59.999Z`) : new Date();
  const from = sp.get("from") ? new Date(`${sp.get("from")}T00:00:00.000Z`) : new Date(to.getTime() - 29 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const groupBy = (sp.get("groupBy") || "day") as keyof typeof GROUP_SQL;
  if (!(groupBy in GROUP_SQL)) return NextResponse.json({ error: "groupBy must be feature, model or day" }, { status: 400 });

  // AiUsageLog has no company column, so non-superadmins are scoped strictly by workspace.
  let where = `WHERE "createdAt" >= ? AND "createdAt" <= ?`;
  const params: unknown[] = [from.toISOString(), to.toISOString()];
  const wsFilter = scope.isAdmin ? Number(sp.get("workspaceId") || 0) || null : scope.workspaceId;
  if (!scope.isAdmin && !wsFilter) return NextResponse.json({ error: "Select a workspace first." }, { status: 400 });
  if (wsFilter) {
    where += ` AND "workspaceId" = ?`;
    params.push(wsFilter);
  }

  const agg = `COUNT(*)::int AS "calls", COALESCE(SUM("promptTokens" + "completionTokens"), 0)::int AS "tokens",
    COALESCE(SUM(CASE WHEN "success" = 1 THEN 0 ELSE 1 END), 0)::int AS "failures",
    COALESCE(ROUND(AVG("durationMs")), 0)::int AS "avgDurationMs"`;
  const [totals, series] = await Promise.all([
    db.get<Omit<Row, "key">>(`SELECT ${agg} FROM "AiUsageLog" ${where}`, params),
    db.query<Row>(
      `SELECT ${GROUP_SQL[groupBy]} AS "key", ${agg} FROM "AiUsageLog" ${where} GROUP BY 1 ORDER BY ${groupBy === "day" ? `1 ASC` : `"tokens" DESC`}`,
      params,
    ),
  ]);

  return NextResponse.json({
    data: {
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy,
      totals: totals ?? { calls: 0, tokens: 0, failures: 0, avgDurationMs: 0 },
      series,
    },
  });
}
