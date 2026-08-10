import { describe, expect, it } from "vitest";
import { buildWorkbook } from "@/lib/excel";

describe("buildWorkbook", () => {
  it("exports deployment notes, fills every field, and applies row borders and height", async () => {
    const workbook = await buildWorkbook("deployments", [
      {
        Date: "06 Mei 2026",
        Version: "v.1.0.2",
        Project: "EcoShop Web",
        Environment: "Production",
        Developer: "Wahyu",
        Changelog: "1. remove purple line in my library\n2. resize icon",
        Status: "Success",
        Notes: "1. Penyempurnaan Visual & UI: Menghapus garis ungu di My Library dan Menyesuaikan ukuran ikon agar lebih proporsional.",
      },
    ]);

    const worksheet = workbook.getWorksheet("Deployments");
    expect(worksheet).toBeTruthy();
    if (!worksheet) return;

    expect(String(worksheet.getCell(2, 1).value)).toBe("06 Mei 2026");
    expect(String(worksheet.getCell(2, 2).value)).toBe("v.1.0.2");
    expect(String(worksheet.getCell(2, 3).value)).toBe("EcoShop Web");
    expect(String(worksheet.getCell(2, 7).value)).toContain("remove purple line");
    expect(String(worksheet.getCell(2, 8).value)).toContain("Penyempurnaan Visual & UI");

    expect(worksheet.getRow(2).height).toBeGreaterThan(24);
    expect(worksheet.getCell(2, 1).border?.top?.style).toBe("thin");
    expect(worksheet.getCell(2, 8).border?.right?.style).toBe("thin");
    expect(worksheet.getCell(4, 1).border?.top).toBeUndefined();
  });
});
