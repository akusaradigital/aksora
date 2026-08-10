import { describe, expect, it } from "vitest";
import {
  parseViewId,
  buildShareableUrl,
  buildShareableUrlWithTab,
  parseTabParam,
  preserveQueryParams,
} from "@/lib/shareable-url";

describe("parseViewId", () => {
  it("returns trimmed string for valid values", () => {
    expect(parseViewId("1")).toBe("1");
    expect(parseViewId("42")).toBe("42");
    expect(parseViewId("999")).toBe("999");
    expect(parseViewId("100000")).toBe("100000");
  });

  it("returns token strings as-is", () => {
    expect(parseViewId("iEIj9K0xOOIGtrTii79FiA")).toBe("iEIj9K0xOOIGtrTii79FiA");
    expect(parseViewId("abc123")).toBe("abc123");
    expect(parseViewId("my-token_value")).toBe("my-token_value");
  });

  it("returns null for empty strings", () => {
    expect(parseViewId("")).toBeNull();
  });

  it("returns null for undefined and null", () => {
    expect(parseViewId(undefined)).toBeNull();
    expect(parseViewId(null)).toBeNull();
  });

  it("handles strings with whitespace by trimming", () => {
    expect(parseViewId("  42  ")).toBe("42");
    expect(parseViewId("\t7\n")).toBe("7");
    expect(parseViewId("  token  ")).toBe("token");
  });

  it("returns null for whitespace-only strings", () => {
    expect(parseViewId("   ")).toBeNull();
    expect(parseViewId("\t\n")).toBeNull();
  });
});

describe("buildShareableUrl", () => {
  const origin = "https://qa-hub.example.com";

  const moduleKeys = [
    "tasks",
    "bugs",
    "test-cases",
    "test-plans",
    "test-sessions",
    "test-suites",
    "meeting-notes",
    "sprints",
    "deployments",
    "assignees",
    "users",
  ] as const;

  it.each(moduleKeys)("builds correct URL for module '%s'", (module) => {
    const url = buildShareableUrl(origin, module, 42);
    expect(url).toBe(`${origin}/${module}?view=42`);
  });

  it("works with numeric ID as number", () => {
    expect(buildShareableUrl(origin, "bugs", 123)).toBe(
      `${origin}/bugs?view=123`,
    );
  });

  it("works with numeric ID as string", () => {
    expect(buildShareableUrl(origin, "tasks", "456")).toBe(
      `${origin}/tasks?view=456`,
    );
  });

  it("works with different origins", () => {
    expect(buildShareableUrl("http://localhost:3000", "bugs", 1)).toBe(
      "http://localhost:3000/bugs?view=1",
    );
  });
});

describe("preserveQueryParams", () => {
  it("preserves page param when adding view", () => {
    const params = new URLSearchParams("page=3");
    const result = preserveQueryParams(params, 42);
    expect(result.get("page")).toBe("3");
    expect(result.get("view")).toBe("42");
  });

  it("preserves q param when adding view", () => {
    const params = new URLSearchParams("q=login+bug");
    const result = preserveQueryParams(params, 10);
    expect(result.get("q")).toBe("login bug");
    expect(result.get("view")).toBe("10");
  });

  it("preserves filter params when adding view", () => {
    const params = new URLSearchParams("status=open&priority=P0&assignee=john");
    const result = preserveQueryParams(params, 5);
    expect(result.get("status")).toBe("open");
    expect(result.get("priority")).toBe("P0");
    expect(result.get("assignee")).toBe("john");
    expect(result.get("view")).toBe("5");
  });

  it("preserves all params when removing view", () => {
    const params = new URLSearchParams("page=2&q=search&view=42&status=open");
    const result = preserveQueryParams(params, undefined, true);
    expect(result.get("page")).toBe("2");
    expect(result.get("q")).toBe("search");
    expect(result.get("status")).toBe("open");
    expect(result.has("view")).toBe(false);
  });

  it("does not mutate the original URLSearchParams", () => {
    const params = new URLSearchParams("page=1");
    preserveQueryParams(params, 99);
    expect(params.has("view")).toBe(false);
  });

  it("overwrites existing view param when adding a new one", () => {
    const params = new URLSearchParams("view=10&page=1");
    const result = preserveQueryParams(params, 20);
    expect(result.get("view")).toBe("20");
    expect(result.get("page")).toBe("1");
  });

  it("handles empty params when adding view", () => {
    const params = new URLSearchParams("");
    const result = preserveQueryParams(params, 7);
    expect(result.get("view")).toBe("7");
  });

  it("handles remove then add in same call (add takes precedence)", () => {
    const params = new URLSearchParams("view=10&page=2");
    const result = preserveQueryParams(params, 20, true);
    // removeView deletes first, then addView sets - so view=20
    expect(result.get("view")).toBe("20");
    expect(result.get("page")).toBe("2");
  });
});

describe("buildShareableUrlWithTab", () => {
  const origin = "https://qa-hub.example.com";

  it("builds URL without tab when tab is not provided", () => {
    expect(buildShareableUrlWithTab(origin, "bugs", 42)).toBe(
      `${origin}/bugs?view=42`,
    );
  });

  it("builds URL without tab when tab is undefined", () => {
    expect(buildShareableUrlWithTab(origin, "bugs", 42, undefined)).toBe(
      `${origin}/bugs?view=42`,
    );
  });

  it("builds URL without tab when tab is empty string", () => {
    expect(buildShareableUrlWithTab(origin, "bugs", 42, "")).toBe(
      `${origin}/bugs?view=42`,
    );
  });

  it("builds URL without tab when tab is whitespace only", () => {
    expect(buildShareableUrlWithTab(origin, "bugs", 42, "   ")).toBe(
      `${origin}/bugs?view=42`,
    );
  });

  it("builds URL with tab when tab is provided", () => {
    expect(buildShareableUrlWithTab(origin, "bugs", 42, "comments")).toBe(
      `${origin}/bugs?view=42&tab=comments`,
    );
  });

  it("trims whitespace from tab name", () => {
    expect(buildShareableUrlWithTab(origin, "bugs", 42, "  history  ")).toBe(
      `${origin}/bugs?view=42&tab=history`,
    );
  });

  it("works with different modules and IDs", () => {
    expect(buildShareableUrlWithTab(origin, "test-cases", 99, "test-steps")).toBe(
      `${origin}/test-cases?view=99&tab=test-steps`,
    );
  });

  it("produces same output as buildShareableUrl when no tab", () => {
    expect(buildShareableUrlWithTab(origin, "tasks", 10)).toBe(
      buildShareableUrl(origin, "tasks", 10),
    );
  });
});

describe("parseTabParam", () => {
  it("returns valid lowercase tab names", () => {
    expect(parseTabParam("comments")).toBe("comments");
    expect(parseTabParam("history")).toBe("history");
    expect(parseTabParam("details")).toBe("details");
  });

  it("returns valid tab names with hyphens", () => {
    expect(parseTabParam("test-steps")).toBe("test-steps");
    expect(parseTabParam("action-items")).toBe("action-items");
  });

  it("returns valid tab names with numbers", () => {
    expect(parseTabParam("tab1")).toBe("tab1");
    expect(parseTabParam("step-2")).toBe("step-2");
  });

  it("trims whitespace and validates", () => {
    expect(parseTabParam("  comments  ")).toBe("comments");
  });

  it("returns null for empty string", () => {
    expect(parseTabParam("")).toBeNull();
  });

  it("returns null for undefined and null", () => {
    expect(parseTabParam(undefined)).toBeNull();
    expect(parseTabParam(null)).toBeNull();
  });

  it("returns null for whitespace-only strings", () => {
    expect(parseTabParam("   ")).toBeNull();
    expect(parseTabParam("\t\n")).toBeNull();
  });

  it("returns null for uppercase letters", () => {
    expect(parseTabParam("Comments")).toBeNull();
    expect(parseTabParam("HISTORY")).toBeNull();
    expect(parseTabParam("testSteps")).toBeNull();
  });

  it("returns null for special characters", () => {
    expect(parseTabParam("tab!")).toBeNull();
    expect(parseTabParam("tab@name")).toBeNull();
    expect(parseTabParam("tab name")).toBeNull();
    expect(parseTabParam("tab_name")).toBeNull();
    expect(parseTabParam("tab.name")).toBeNull();
  });

  it("returns null for strings with slashes", () => {
    expect(parseTabParam("tab/name")).toBeNull();
    expect(parseTabParam("/comments")).toBeNull();
  });
});

describe("preserveQueryParams with tab options", () => {
  it("adds tab param when addTab is provided", () => {
    const params = new URLSearchParams("view=42&page=1");
    const result = preserveQueryParams(params, undefined, false, { addTab: "comments" });
    expect(result.get("view")).toBe("42");
    expect(result.get("page")).toBe("1");
    expect(result.get("tab")).toBe("comments");
  });

  it("removes tab param when removeTab is true", () => {
    const params = new URLSearchParams("view=42&tab=comments&page=1");
    const result = preserveQueryParams(params, undefined, false, { removeTab: true });
    expect(result.get("view")).toBe("42");
    expect(result.get("page")).toBe("1");
    expect(result.has("tab")).toBe(false);
  });

  it("overwrites existing tab param", () => {
    const params = new URLSearchParams("view=42&tab=comments");
    const result = preserveQueryParams(params, undefined, false, { addTab: "history" });
    expect(result.get("tab")).toBe("history");
  });

  it("handles addView and addTab together", () => {
    const params = new URLSearchParams("page=2");
    const result = preserveQueryParams(params, 42, false, { addTab: "details" });
    expect(result.get("view")).toBe("42");
    expect(result.get("tab")).toBe("details");
    expect(result.get("page")).toBe("2");
  });

  it("handles removeView and removeTab together", () => {
    const params = new URLSearchParams("view=42&tab=comments&page=1&q=test");
    const result = preserveQueryParams(params, undefined, true, { removeTab: true });
    expect(result.has("view")).toBe(false);
    expect(result.has("tab")).toBe(false);
    expect(result.get("page")).toBe("1");
    expect(result.get("q")).toBe("test");
  });

  it("preserves other params when manipulating tab", () => {
    const params = new URLSearchParams("view=42&page=3&q=search&status=open");
    const result = preserveQueryParams(params, undefined, false, { addTab: "history" });
    expect(result.get("view")).toBe("42");
    expect(result.get("page")).toBe("3");
    expect(result.get("q")).toBe("search");
    expect(result.get("status")).toBe("open");
    expect(result.get("tab")).toBe("history");
  });

  it("does not add tab when options is undefined", () => {
    const params = new URLSearchParams("view=42&tab=comments");
    const result = preserveQueryParams(params, undefined, false);
    expect(result.get("tab")).toBe("comments");
  });
});
