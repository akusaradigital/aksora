import { describe, expect, it } from "vitest";
import { buildDownloadFilename, formatIndonesiaTimestamp } from "@/lib/download-name";

describe("download-name", () => {
  it("formats timestamps in the expected Jakarta locale shape", () => {
    const date = new Date("2026-05-18T08:09:10Z");

    expect(formatIndonesiaTimestamp(date)).toBe("18-Mei-2026-15-09-10");
  });

  it("builds stable export file names", () => {
    const date = new Date("2026-05-18T08:09:10Z");

    expect(buildDownloadFilename("test-cases", "export", "xlsx", date)).toBe(
      "test-cases-export-18-Mei-2026-15-09-10.xlsx",
    );
    expect(buildDownloadFilename("users", "template", "pdf", date)).toBe(
      "users-template-18-Mei-2026-15-09-10.pdf",
    );
  });
});
