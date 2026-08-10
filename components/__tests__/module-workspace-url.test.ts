import { describe, expect, it } from "vitest";
import { buildWorkspaceUrl, withUpdatedWorkspaceParams } from "@/components/module/module-workspace-url";

describe("module-workspace-url", () => {
  it("builds URL without query when params are empty", () => {
    expect(buildWorkspaceUrl("/users", new URLSearchParams())).toBe("/users");
  });

  it("builds URL with query when params exist", () => {
    const params = new URLSearchParams("page=2&q=alice");
    expect(buildWorkspaceUrl("/users", params)).toBe("/users?page=2&q=alice");
  });

  it("updates search params while preserving unrelated values", () => {
    const params = withUpdatedWorkspaceParams("status=active&page=3", (nextParams) => {
      nextParams.set("q", "alice");
      nextParams.set("page", "1");
    });

    expect(params.toString()).toBe("status=active&page=1&q=alice");
  });

  it("can remove search filters cleanly", () => {
    const params = withUpdatedWorkspaceParams("q=alice&page=2", (nextParams) => {
      nextParams.delete("q");
    });

    expect(params.toString()).toBe("page=2");
  });
});

