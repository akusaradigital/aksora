import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { mapTestmoCase } from "@/lib/testmo";
import { normalizeTriage } from "@/lib/bug-triage";

describe("mapTestmoCase", () => {
  it("joins ordered steps, strips HTML and maps priority", () => {
    const mapped = mapTestmoCase({
      id: 1,
      name: "Login",
      custom_priority: { name: "high" },
      custom_steps: [
        { text1: "<p>Submit</p>", text3: "<p>Dashboard</p>", display_order: 2 },
        { text1: "<p>Open &amp; type</p>", text3: null, display_order: 1 },
      ],
    });
    expect(mapped.testStep).toBe("1. Open & type\n2. Submit");
    expect(mapped.expectedResult).toBe("Dashboard");
    expect(mapped.priority).toBe("High");
  });
});

describe("normalizeTriage", () => {
  it("clamps confidence and falls back on bad tiers", () => {
    expect(normalizeTriage({ tier: "p1", confidence: 140, suggestedSeverity: "critical" })).toMatchObject({ tier: "P1", confidence: 100, suggestedSeverity: "Critical" });
    expect(normalizeTriage({ tier: "urgent", confidence: "x" })).toMatchObject({ tier: "P2", confidence: 0, suggestedSeverity: "Medium" });
  });
});
