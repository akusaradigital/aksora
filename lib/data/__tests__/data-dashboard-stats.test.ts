import { describe, expect, it } from "vitest";
import { dashboardCacheKey } from "@/lib/data/data-dashboard-stats";

describe("dashboardCacheKey", () => {
  it("produces distinct keys for different workspaces sharing the same company", () => {
    const keyWorkspace1 = dashboardCacheKey("acme", false, "qa", "", 1);
    const keyWorkspace2 = dashboardCacheKey("acme", false, "qa", "", 2);
    expect(keyWorkspace1).not.toBe(keyWorkspace2);
  });

  it("falls back to a stable marker when workspaceId is absent", () => {
    const key = dashboardCacheKey("acme", false, "qa", "");
    expect(key).toBe("acme|user|qa|__all__|__none__");
  });
});
