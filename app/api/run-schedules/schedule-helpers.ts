import { db } from "@/lib/db";
import type { SchedulePreset } from "@/lib/run-schedules";

/** Stored hour/weekdaysOnly per preset; only "custom" uses the caller's values. */
export function presetDefaults(preset: SchedulePreset, hour?: number, weekdaysOnly?: boolean) {
  if (preset === "nightly") return { hour: 0, weekdaysOnly: false };
  if (preset === "hourly") return { hour: 9, weekdaysOnly: true };
  if (preset === "prerelease") return { hour: 6, weekdaysOnly: true };
  return { hour: hour ?? 0, weekdaysOnly: Boolean(weekdaysOnly) };
}

/** Ensures the suite and environment belong to the workspace. Returns an error message or null. */
export async function checkScheduleRefs(workspaceId: number | null, testSuiteId: number, environmentId: number | null) {
  const suite = await db.get<{ id: number }>(
    `SELECT "id" FROM "TestSuite" WHERE "id" = ? AND "deletedAt" IS NULL AND "workspaceId" IS NOT DISTINCT FROM ?`,
    [testSuiteId, workspaceId],
  );
  if (!suite) return "Test suite not found in this workspace";
  if (environmentId) {
    const env = await db.get<{ id: number }>(
      `SELECT "id" FROM "TestEnvironment" WHERE "id" = ? AND "deletedAt" IS NULL AND "workspaceId" IS NOT DISTINCT FROM ?`,
      [environmentId, workspaceId],
    );
    if (!env) return "Environment not found in this workspace";
  }
  return null;
}
