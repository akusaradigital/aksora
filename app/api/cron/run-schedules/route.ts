import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySharedSecret } from "@/lib/auth";
import { createScheduledRun, DEFAULT_TIMEZONE, isDue, type ScheduleRow } from "@/lib/run-schedules";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!verifySharedSecret(auth, secret ? `Bearer ${secret}` : null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await db.query<ScheduleRow & { timezone: string }>(
    `SELECT rs.*, COALESCE(w."timezone", ?) AS "timezone"
     FROM "RunSchedule" rs LEFT JOIN "Workspace" w ON w."id" = rs."workspaceId"
     WHERE rs."deletedAt" IS NULL AND rs."active" = 1`,
    [DEFAULT_TIMEZONE],
  );

  const now = new Date();
  const created: { scheduleId: number; runId: number }[] = [];
  const failed: { scheduleId: number; error: string }[] = [];

  for (const s of schedules) {
    if (!isDue(s, now, s.timezone)) continue;
    // Atomic claim so two overlapping cron hits cannot both fire this hour. A failed run also keeps
    // the claim, so a broken schedule is not retried on every hit within the same hour.
    const claimed = await db.get<{ id: number }>(
      `UPDATE "RunSchedule" SET "lastRunAt" = CURRENT_TIMESTAMP
       WHERE "id" = ? AND ("lastRunAt" IS NULL OR "lastRunAt" < date_trunc('hour', CURRENT_TIMESTAMP)) RETURNING "id"`,
      [s.id],
    );
    if (!claimed) continue;
    try {
      const run = await createScheduledRun(s);
      created.push({ scheduleId: s.id, runId: run.id });
    } catch (err) {
      failed.push({ scheduleId: s.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, checked: schedules.length, created, failed });
}
