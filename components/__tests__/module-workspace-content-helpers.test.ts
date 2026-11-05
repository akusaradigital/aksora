import { describe, expect, it } from "vitest";
import {
  applyWorkLogsDateRowSpan,
  sortWorkLogs,
  compareVersions,
  getLatestVersion,
  getNextVersion,
} from "@/components/module/module-workspace-content-helpers";

describe("module-workspace-content-helpers", () => {
  it("sorts work logs by date descending and time ascending (jam urut)", () => {
    const raw = [
      { id: 1, date: "2026-11-04", startTime: "08:30", endTime: "10:40" },
      { id: 2, date: "2026-11-04", startTime: "06:00", endTime: "08:30" },
      { id: 3, date: "2026-11-04", startTime: "02:00", endTime: "05:20" },
      { id: 4, date: "2026-11-03", startTime: "08:40", endTime: "11:00" },
      { id: 5, date: "2026-11-03", startTime: "06:00", endTime: "08:40" },
      { id: 6, date: "2026-11-03", startTime: "" },
    ];

    const sorted = sortWorkLogs(raw);
    expect(sorted.map((r) => r.id)).toEqual([3, 2, 1, 5, 4, 6]);
    expect(sorted[0].startTime).toBe("02:00");
    expect(sorted[1].startTime).toBe("06:00");
    expect(sorted[2].startTime).toBe("08:30");
    expect(sorted[3].startTime).toBe("06:00");
    expect(sorted[4].startTime).toBe("08:40");
    expect(sorted[5].startTime).toBe("");
  });

  it("handles single-digit hours correctly when sorting times", () => {
    const raw = [
      { id: 1, date: "2026-11-04", startTime: "10:00" },
      { id: 2, date: "2026-11-04", startTime: "8:30" },
      { id: 3, date: "2026-11-04", startTime: "02:00" },
    ];

    const sorted = sortWorkLogs(raw);
    expect(sorted.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("calculates dateRowSpan for merged date cells", () => {
    const raw = [
      { id: 1, date: "2026-11-04", startTime: "08:30" },
      { id: 2, date: "2026-11-04", startTime: "06:00" },
      { id: 3, date: "2026-11-04", startTime: "02:00" },
      { id: 4, date: "2026-11-03", startTime: "08:40" },
      { id: 5, date: "2026-11-03", startTime: "06:00" },
    ];

    const result = applyWorkLogsDateRowSpan(raw, false);
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe(3);
    expect(result[0].dateRowSpan).toBe(3);
    expect(result[1].id).toBe(2);
    expect(result[1].dateRowSpan).toBe(0);
    expect(result[2].id).toBe(1);
    expect(result[2].dateRowSpan).toBe(0);

    expect(result[3].id).toBe(5);
    expect(result[3].dateRowSpan).toBe(2);
    expect(result[4].id).toBe(4);
    expect(result[4].dateRowSpan).toBe(0);
  });

  it("sets dateRowSpan to 1 for all rows when custom sort is active", () => {
    const raw = [
      { id: 1, date: "2026-11-04", startTime: "08:30" },
      { id: 2, date: "2026-11-04", startTime: "06:00" },
    ];

    const result = applyWorkLogsDateRowSpan(raw, true);
    expect(result[0].dateRowSpan).toBe(1);
    expect(result[1].dateRowSpan).toBe(1);
  });

  it("manages version comparisons and sequencing", () => {
    expect(compareVersions("v1.0.1", "v1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("v1.0.0", "v1.1.0")).toBeLessThan(0);
    expect(compareVersions("v1.0.0", "v1.0.0")).toBe(0);
    expect(getLatestVersion([{ id: 1, version: "v1.0.2" }, { id: 2, version: "v1.0.10" }])).toBe("v1.0.10");
    expect(getNextVersion("v1.0.9")).toBe("v1.0.10");
  });
});
