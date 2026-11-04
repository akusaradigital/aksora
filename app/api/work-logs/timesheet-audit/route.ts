import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Fetch Indonesian holidays
async function getIndonesianHolidays(year: number): Promise<Record<string, string>> {
  try {
    const res = await fetch(`https://libur.deno.dev/api?year=${year}`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const json = (await res.json()) as Array<{ date: string; name: string; is_national_holiday: boolean }>;
      const map: Record<string, string> = {};
      for (const item of json) {
        map[item.date] = item.name + (item.is_national_holiday ? "" : " (Cuti Bersama)");
      }
      return map;
    }
  } catch {}

  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
    if (res.ok) {
      const json = (await res.json()) as Array<{ date: string; localName: string }>;
      const map: Record<string, string> = {};
      for (const item of json) {
        map[item.date] = item.localName;
      }
      return map;
    }
  } catch {}

  return {};
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = searchParams.get("month") || currentMonthStr; // e.g. "2026-11"
  const targetMin = Math.max(60, parseInt(searchParams.get("target") || "480", 10)); // Default min 8h (480m)

  const [yearStr, monthNumStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10) || now.getFullYear();
  const month = parseInt(monthNumStr, 10) || now.getMonth() + 1;

  const holidays = await getIndonesianHolidays(year);

  const { company, andWhere, params } = getAccessScope(user);

  // Fetch all logs for the specified month
  const startDate = `${monthStr}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const logs = await db.query<{
    id: number | string;
    date: string;
    durationMinutes: number | string;
    startTime?: string;
    endTime?: string;
    project?: string;
    category?: string;
    description?: string;
    output?: string;
    sicmundusEntryId?: string;
    assignee?: string;
  }>(
    `SELECT "id", "date", "durationMinutes", "startTime", "endTime", "project", "category", "description", "output", "sicmundusEntryId", "assignee"
     FROM "WorkLog"
     WHERE "deletedAt" IS NULL AND "date" >= ? AND "date" <= ? ${andWhere}
     ORDER BY "date" ASC, "startTime" ASC`,
    [startDate, endDate, ...params]
  );

  // Group logs by date
  const logsByDate = new Map<string, typeof logs>();
  for (const log of logs) {
    const d = String(log.date || "").slice(0, 10);
    const list = logsByDate.get(d) || [];
    list.push(log);
    logsByDate.set(d, list);
  }

  const days = [];
  let totalMinutesLogged = 0;
  let workingDaysCount = 0;
  let compliantDaysCount = 0;
  let underTargetDaysCount = 0;
  let missingDaysCount = 0;

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dayStr = String(dayNum).padStart(2, "0");
    const fullDate = `${monthStr}-${dayStr}`;
    const dateObj = new Date(year, month - 1, dayNum);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayName = holidays[fullDate] || null;
    const isHoliday = Boolean(holidayName);

    const dayLogs = logsByDate.get(fullDate) || [];
    let dayTotalMinutes = 0;

    for (const l of dayLogs) {
      const dur = typeof l.durationMinutes === "number" ? l.durationMinutes : parseInt(String(l.durationMinutes || "0"), 10);
      if (!isNaN(dur) && dur > 0) {
        dayTotalMinutes += dur;
      }
    }

    totalMinutesLogged += dayTotalMinutes;

    let status: "compliant" | "under_target" | "missing" | "weekend" | "holiday" = "missing";
    if (dayTotalMinutes >= targetMin) {
      status = "compliant";
      compliantDaysCount++;
    } else if (dayTotalMinutes > 0) {
      status = "under_target";
      underTargetDaysCount++;
    } else if (isHoliday) {
      status = "holiday";
    } else if (isWeekend) {
      status = "weekend";
    } else {
      status = "missing";
      missingDaysCount++;
    }

    if (!isWeekend && !isHoliday) {
      workingDaysCount++;
    }

    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    days.push({
      date: fullDate,
      dayNumber: dayNum,
      dayName: dayNames[dayOfWeek],
      dayOfWeek,
      isWeekend,
      isHoliday,
      holidayName,
      totalMinutes: dayTotalMinutes,
      totalHours: Number((dayTotalMinutes / 60).toFixed(1)),
      missingMinutes: Math.max(0, targetMin - dayTotalMinutes),
      status,
      entriesCount: dayLogs.length,
      entries: dayLogs.map((item) => ({
        id: item.id,
        project: item.project || "General",
        category: item.category || "development",
        description: item.description || "",
        durationMinutes: typeof item.durationMinutes === "number" ? item.durationMinutes : parseInt(String(item.durationMinutes || "0"), 10),
        startTime: item.startTime,
        endTime: item.endTime,
        sicmundusEntryId: item.sicmundusEntryId,
      })),
    });
  }

  const minTargetHoursTotal = workingDaysCount * 8;
  const actualHoursTotal = Number((totalMinutesLogged / 60).toFixed(1));

  return NextResponse.json({
    data: {
      month: monthStr,
      year,
      targetDailyMinutes: targetMin,
      summary: {
        totalDays: daysInMonth,
        workingDays: workingDaysCount,
        compliantDays: compliantDaysCount,
        underTargetDays: underTargetDaysCount,
        missingDays: missingDaysCount,
        totalHoursLogged: actualHoursTotal,
        minTargetHours: minTargetHoursTotal,
        completionRate: minTargetHoursTotal > 0 ? Math.round((actualHoursTotal / minTargetHoursTotal) * 100) : 100,
      },
      days,
    },
  });
}
