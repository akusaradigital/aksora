import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const TARGET_MINUTES = 480; // 8h

function weekBoundaries(now: Date): { monIso: string; sunIso: string } {
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return {
    monIso: mon.toISOString().slice(0, 10),
    sunIso: sun.toISOString().slice(0, 10),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const { monIso, sunIso } = weekBoundaries(now);

  const company = user.company || "";
  const workspaceFilter = user.role === "superadmin" ? "" : ` AND "workspaceId" = ?`;
  const workspaceParams = user.role === "superadmin" ? [] : [user.workspaceId ?? 0];

  // Fetch work logs for the current week
  const rows = await db.query<{ date: string; durationMinutes: number }>(
    `SELECT "date", COALESCE("durationMinutes", 0) AS "durationMinutes"
     FROM "WorkLog"
     WHERE "company" = ?
       AND "date" >= ?
       AND "date" <= ?
       AND ("deletedAt" IS NULL OR "deletedAt" = '')
       ${workspaceFilter}`,
    [company, monIso, sunIso, ...workspaceParams]
  );

  // Aggregate per day
  const minutesByDay: Record<string, number> = {};
  for (const row of rows) {
    const d = String(row.date).slice(0, 10);
    minutesByDay[d] = (minutesByDay[d] ?? 0) + Number(row.durationMinutes ?? 0);
  }

  const todayMinutes = minutesByDay[todayIso] ?? 0;

  // Build Mon–Fri status pills
  const days: Array<{ label: string; iso: string; minutes: number; status: "done" | "warning" | "future" }> = [];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const monDate = new Date(monIso + "T00:00:00");
  for (let i = 0; i < 5; i++) {
    const d = new Date(monDate);
    d.setDate(monDate.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const mins = minutesByDay[iso] ?? 0;
    let status: "done" | "warning" | "future";
    if (iso > todayIso) {
      status = "future";
    } else if (mins >= TARGET_MINUTES) {
      status = "done";
    } else {
      status = "warning";
    }
    days.push({ label: dayLabels[i], iso, minutes: mins, status });
  }

  const weekTotal = Object.values(minutesByDay).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    data: {
      todayMinutes,
      targetMinutes: TARGET_MINUTES,
      weekTotalMinutes: weekTotal,
      days,
      date: todayIso,
    },
  });
}
