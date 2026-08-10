import { describe, expect, it } from "vitest";
import { buildPdfBuffer } from "@/lib/pdf-export";

describe("buildPdfBuffer", () => {
  it("creates a valid pdf buffer for deployments", async () => {
    const buffer = await buildPdfBuffer("deployments", [
      {
        Date: "06 Mei 2026",
        Version: "v.1.0.3",
        Project: "EcoShop Web",
        Environment: "Production",
        Developer: "Wahyu",
        Status: "Success",
        Changelog: "testing",
        Notes: "1. Pembaruan Umum: testing.",
      },
    ]);

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("sanitizes unicode text so PDF export does not crash", async () => {
    const buffer = await buildPdfBuffer("meeting-notes", [
      {
        Date: "2026-05-06",
        "Project Name": "QA Daily",
        Topic: "Daily standup – sync 😅",
        Attendees: "Wahyu, Ana",
        "Discussion / Summary": "Fix export - works with smart quotes “ok”",
        "Action Items / Decisions": "1. Verify PDF download · 2. Ship",
      },
    ]);

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
