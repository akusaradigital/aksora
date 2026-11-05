import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { get: vi.fn(), query: vi.fn(), run: vi.fn() } }));

import { isDue, nextRunAt } from "@/lib/run-schedules";

const TZ = "Asia/Jakarta"; // UTC+7
// 2026-11-04 is a Wednesday.
const at = (iso: string) => new Date(iso);

describe("run-schedules isDue", () => {
  it("nightly fires at local midnight only", () => {
    expect(isDue({ preset: "nightly" }, at("2026-11-03T17:10:00Z"), TZ)).toBe(true); // 00:10 WIB
    expect(isDue({ preset: "nightly" }, at("2026-11-03T18:10:00Z"), TZ)).toBe(false); // 01:10 WIB
  });

  it("hourly runs 09-17 on weekdays only", () => {
    expect(isDue({ preset: "hourly" }, at("2026-11-04T02:00:00Z"), TZ)).toBe(true); // Wed 09:00
    expect(isDue({ preset: "hourly" }, at("2026-11-04T11:00:00Z"), TZ)).toBe(false); // Wed 18:00
    expect(isDue({ preset: "hourly" }, at("2026-11-07T03:00:00Z"), TZ)).toBe(false); // Sat 10:00
  });

  it("custom respects hour and weekdaysOnly", () => {
    const s = { preset: "custom", hour: 14, weekdaysOnly: 1 };
    expect(isDue(s, at("2026-11-04T07:30:00Z"), TZ)).toBe(true);
    expect(isDue(s, at("2026-11-08T07:30:00Z"), TZ)).toBe(false); // Sunday
  });

  it("does not double-fire in the same local hour, and skips inactive", () => {
    const now = at("2026-11-03T23:45:00Z"); // Wed 06:45 WIB
    expect(isDue({ preset: "prerelease", lastRunAt: "2026-11-03T23:05:00Z" }, now, TZ)).toBe(false);
    expect(isDue({ preset: "prerelease", lastRunAt: "2026-11-02T23:05:00Z" }, now, TZ)).toBe(true);
    expect(isDue({ preset: "prerelease", active: 0 }, now, TZ)).toBe(false);
  });

  it("computes the next run", () => {
    expect(nextRunAt({ preset: "nightly" }, at("2026-11-04T05:00:00Z"), TZ)?.toISOString()).toBe("2026-11-04T17:00:00.000Z");
  });
});
