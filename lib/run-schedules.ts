import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { getEnvironmentForRun } from "@/lib/test-environments";

export const SCHEDULE_PRESETS = ["nightly", "hourly", "prerelease", "custom"] as const;
export type SchedulePreset = (typeof SCHEDULE_PRESETS)[number];
export const DEFAULT_TIMEZONE = "Asia/Jakarta";

export type ScheduleLike = {
  preset: string;
  hour?: number | null;
  weekdaysOnly?: number | boolean | null;
  active?: number | boolean | null;
  lastRunAt?: string | Date | null;
};

export type ScheduleRow = ScheduleLike & {
  id: number;
  workspaceId: number | null;
  name: string;
  testSuiteId: number;
  environmentId: number | null;
};

export const scheduleSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  testSuiteId: z.coerce.number().int().positive("Pick a test suite"),
  environmentId: z.coerce.number().int().positive().nullable().optional(),
  preset: z.enum(SCHEDULE_PRESETS),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  weekdaysOnly: z.boolean().optional(),
  active: z.boolean().optional(),
});

type LocalParts = { year: string; month: string; day: string; hour: number; weekday: string };

function localParts(date: Date, timezone: string): LocalParts {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short",
    });
  } catch {
    return localParts(date, DEFAULT_TIMEZONE); // invalid tz string stored on the workspace
  }
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { year: p.year, month: p.month, day: p.day, hour: Number(p.hour) % 24, weekday: p.weekday };
}

/** True when the schedule should fire in the local hour that contains `now`. */
export function matchesSlot(schedule: ScheduleLike, now: Date, timezone: string): boolean {
  const { hour, weekday } = localParts(now, timezone);
  const weekend = weekday === "Sat" || weekday === "Sun";
  switch (schedule.preset) {
    case "nightly": return hour === 0;
    case "hourly": return !weekend && hour >= 9 && hour <= 17;
    case "prerelease": return !weekend && hour === 6;
    case "custom": return hour === Number(schedule.hour ?? 0) && !(Number(schedule.weekdaysOnly) && weekend);
    default: return false;
  }
}

/** Due = active, in a matching slot, and not already fired in this local hour (guards double cron hits). */
export function isDue(schedule: ScheduleLike, now: Date, timezone: string = DEFAULT_TIMEZONE): boolean {
  if (!Number(schedule.active ?? 1)) return false;
  if (!matchesSlot(schedule, now, timezone)) return false;
  if (!schedule.lastRunAt) return true;
  const last = new Date(schedule.lastRunAt);
  if (Number.isNaN(last.getTime())) return true;
  const a = localParts(last, timezone);
  const b = localParts(now, timezone);
  return !(a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour);
}

/** Next fire time (start of the local hour), searching up to 8 days ahead. */
export function nextRunAt(schedule: ScheduleLike, now: Date, timezone: string = DEFAULT_TIMEZONE): Date | null {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  for (let i = 1; i <= 24 * 8; i++) {
    const candidate = new Date(start.getTime() + i * 3600_000);
    if (matchesSlot(schedule, candidate, timezone)) return candidate;
  }
  return null;
}

/**
 * Creates an ExecutionRun + Pending CaseVerdict rows for a suite.
 * Mirrors POST /api/execution-runs, scoped by the suite's workspace.
 */
async function createRunForSuite(opts: {
  workspaceId: number | null;
  testSuiteId: number;
  runType: string;
  tester: string;
  runnerStatus: string;
  scheduleId: number | null;
  environmentId: number | null;
}) {
  const ws = opts.workspaceId;
  const suite = await db.get<{ id: number; company: string; testPlanId: string }>(
    `SELECT "id", "company", "testPlanId" FROM "TestSuite"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND "workspaceId" IS NOT DISTINCT FROM ?`,
    [opts.testSuiteId, ws],
  );
  if (!suite) throw new Error(`Test suite ${opts.testSuiteId} not found`);

  const lastRun = await db.get<{ maxNum: number | null }>(
    `SELECT MAX("runNumber") as "maxNum" FROM "ExecutionRun"
     WHERE "testSuiteId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND "workspaceId" IS NOT DISTINCT FROM ?`,
    [suite.id, ws],
  );
  const runNumber = (Number(lastRun?.maxNum) || 0) + 1;

  const cases = await db.query<{ id: number }>(
    `SELECT "id" FROM "TestCase"
     WHERE "testSuiteId" = CAST(? AS TEXT) AND "deletedAt" IS NULL AND "workspaceId" IS NOT DISTINCT FROM ?
     ORDER BY "id" ASC`,
    [String(suite.id), ws],
  );

  const run = await db.get<{ id: number }>(
    `INSERT INTO "ExecutionRun" ("company", "workspaceId", "testSuiteId", "testPlanId", "runNumber", "runType", "viewports", "status", "tester", "totalCases", "startedAt", "runnerStatus", "scheduleId", "environmentId")
     VALUES (?, ?, CAST(? AS INTEGER), ?, ?, ?, '', 'in-progress', ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
     RETURNING "id"`,
    [suite.company, ws, suite.id, suite.testPlanId, runNumber, opts.runType, opts.tester, cases.length, opts.runnerStatus, opts.scheduleId, opts.environmentId],
  );
  if (!run) throw new Error("Failed to create run");

  const CHUNK = 100;
  for (let i = 0; i < cases.length; i += CHUNK) {
    const chunk = cases.slice(i, i + CHUNK);
    const values = chunk.map(() => "(?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), 'Pending')").join(", ");
    const params: unknown[] = [];
    for (const tc of chunk) params.push(suite.company, ws, run.id, tc.id);
    await db.run(
      `INSERT INTO "CaseVerdict" ("company", "workspaceId", "executionRunId", "testCaseId", "verdict") VALUES ${values}`,
      params,
    );
  }

  await logActivity(suite.company, "ExecutionRun", String(run.id), "Created", `Run #${runNumber} started`, opts.tester, undefined, ws);
  return { id: run.id, runNumber, totalCases: cases.length };
}

/** Creates a queued AI run for the schedule's suite, then stamps lastRunAt. */
export async function createScheduledRun(schedule: ScheduleRow) {
  // Fail fast on empty/expired variables before creating anything.
  if (schedule.environmentId) await getEnvironmentForRun(schedule.environmentId, schedule.workspaceId);

  const run = await createRunForSuite({
    workspaceId: schedule.workspaceId,
    testSuiteId: schedule.testSuiteId,
    runType: "ai",
    tester: `Schedule: ${schedule.name}`,
    runnerStatus: "queued",
    scheduleId: schedule.id,
    environmentId: schedule.environmentId ?? null,
  });

  await db.run(
    `UPDATE "RunSchedule" SET "lastRunAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`,
    [schedule.id],
  );
  return run;
}
