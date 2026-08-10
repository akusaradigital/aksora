import { describe, expect, it } from "vitest";
import { buildExportFilename, buildPdfFilename } from "@/app/api/export/[module]/route";

describe("buildExportFilename", () => {
  it("includes date and time in the export filename", () => {
    const filename = buildExportFilename(
      "deployments",
      false,
      new Date(Date.UTC(2026, 4, 6, 9, 13, 0)),
    );

    expect(filename).toBe("deployments-export-06-Mei-2026-16-13-00.xlsx");
  });

  it("uses template label when exporting template", () => {
    const filename = buildExportFilename(
      "deployments",
      true,
      new Date(Date.UTC(2026, 4, 6, 9, 13, 0)),
    );

    expect(filename).toBe("deployments-template-06-Mei-2026-16-13-00.xlsx");
  });

  it("builds pdf filenames too", () => {
    const filename = buildPdfFilename(
      "deployments",
      false,
      new Date(Date.UTC(2026, 4, 6, 9, 13, 0)),
    );

    expect(filename).toBe("deployments-export-06-Mei-2026-16-13-00.pdf");
  });
});
