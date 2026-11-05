import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { CAPABILITIES, ROLE_PRESETS, resolveCapabilities } from "@/lib/capabilities";

describe("resolveCapabilities", () => {
  it("gives superadmin and admin every capability, even with a custom role", () => {
    expect(resolveCapabilities("superadmin")).toEqual(CAPABILITIES);
    expect(resolveCapabilities("Admin (Owner)", ["reports.view"])).toEqual(CAPABILITIES);
  });

  it("uses the built-in preset when no custom role is set", () => {
    expect(resolveCapabilities("qa")).toEqual(ROLE_PRESETS.qa);
    expect(resolveCapabilities("pm")).toContain("reports.share");
  });

  it("lets a custom role override the preset and drops unknown capabilities", () => {
    expect(resolveCapabilities("qa", ["reports.view", "bogus.cap"])).toEqual(["reports.view"]);
    expect(resolveCapabilities("qa", [])).toEqual([]);
  });

  it("falls back to guest for unknown roles", () => {
    expect(resolveCapabilities("stranger")).toEqual(["reports.view"]);
    expect(resolveCapabilities(undefined)).toEqual(["reports.view"]);
  });
});
