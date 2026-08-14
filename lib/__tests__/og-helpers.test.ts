import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";
import { buildOgDescription, getItemTitleField } from "@/lib/og-helpers";

// Mocks for generateMetadata tests
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbGet: vi.fn(),
  getAccessScope: vi.fn(),
  getTableName: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: { get: mocks.dbGet },
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
  getTableName: mocks.getTableName,
}));

vi.mock("@/lib/data", () => ({
  getAssigneeOptions: vi.fn().mockResolvedValue([]),
  getModuleRows: vi.fn().mockResolvedValue([]),
  getModuleRowsPage: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  getProjectOptions: vi.fn().mockResolvedValue([]),
  getTestCaseStatsBySuiteIds: vi.fn().mockResolvedValue(new Map()),
  getTestPlanReferenceRows: vi.fn().mockResolvedValue([]),
  getTestSuitesByPlanIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/modules", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/modules")>();
  return {
    ...actual,
    moduleOrder: actual.moduleOrder,
    moduleConfigs: actual.moduleConfigs,
  };
});

import { generateMetadata } from "@/app/[module]/page";

type OpenGraphMetadata = NonNullable<Metadata["openGraph"]> & { type?: string };

function getOpenGraph(result: Awaited<ReturnType<typeof generateMetadata>>) {
  expect(result.openGraph).toBeDefined();
  return result.openGraph as OpenGraphMetadata;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItemTitleField", () => {
  it("returns title field for tasks module", () => {
    expect(getItemTitleField("tasks", { id: 1, title: "Fix login bug" })).toBe("Fix login bug");
  });

  it("returns title field for bugs module", () => {
    expect(getItemTitleField("bugs", { id: 2, title: "Page crashes on submit" })).toBe("Page crashes on submit");
  });

  it("returns caseName field for test-cases module", () => {
    expect(getItemTitleField("test-cases", { id: 3, caseName: "Valid Login Test" })).toBe("Valid Login Test");
  });

  it("returns name field for users module", () => {
    expect(getItemTitleField("users", { id: 4, name: "John Doe" })).toBe("John Doe");
  });

  it("returns name field for assignees module", () => {
    expect(getItemTitleField("assignees", { id: 5, name: "Jane Smith" })).toBe("Jane Smith");
  });

  it("returns name field for sprints module", () => {
    expect(getItemTitleField("sprints", { id: 6, name: "Sprint 12" })).toBe("Sprint 12");
  });

  it("returns title field for meeting-notes module", () => {
    expect(getItemTitleField("meeting-notes", { id: 7, title: "Daily Standup" })).toBe("Daily Standup");
  });

  it("returns title field for test-plans module", () => {
    expect(getItemTitleField("test-plans", { id: 8, title: "Regression Plan" })).toBe("Regression Plan");
  });

  it("returns title field for test-suites module", () => {
    expect(getItemTitleField("test-suites", { id: 9, title: "Checkout Suite" })).toBe("Checkout Suite");
  });

  it("returns scope field for test-sessions module", () => {
    expect(getItemTitleField("test-sessions", { id: 10, scope: "Login, Profile" })).toBe("Login, Profile");
  });

  it("returns version field for deployments module", () => {
    expect(getItemTitleField("deployments", { id: 11, version: "v1.3.0" })).toBe("v1.3.0");
  });

  it("falls back to title when primary field is missing", () => {
    expect(getItemTitleField("test-cases", { id: 3, title: "Fallback Title" })).toBe("Fallback Title");
  });

  it("falls back to name when primary field and title are missing", () => {
    expect(getItemTitleField("tasks", { id: 1, name: "Fallback Name" })).toBe("Fallback Name");
  });

  it("falls back to #id when no title fields are available", () => {
    expect(getItemTitleField("tasks", { id: 42 })).toBe("#42");
  });

  it("returns Untitled when no fields are available at all", () => {
    expect(getItemTitleField("tasks", {})).toBe("Untitled");
  });

  it("trims whitespace from title values", () => {
    expect(getItemTitleField("tasks", { id: 1, title: "  Spaced Title  " })).toBe("Spaced Title");
  });

  it("skips empty string title fields", () => {
    expect(getItemTitleField("tasks", { id: 1, title: "" })).toBe("#1");
  });

  it("skips whitespace-only title fields", () => {
    expect(getItemTitleField("tasks", { id: 1, title: "   " })).toBe("#1");
  });
});

describe("buildOgDescription", () => {
  it("includes status when available", () => {
    const result = buildOgDescription("tasks", { status: "doing" });
    expect(result).toContain("Status: doing");
  });

  it("includes priority when available", () => {
    const result = buildOgDescription("bugs", { priority: "P0" });
    expect(result).toContain("Priority: P0");
  });

  it("includes severity when available", () => {
    const result = buildOgDescription("bugs", { severity: "critical" });
    expect(result).toContain("Severity: critical");
  });

  it("includes assignee when available", () => {
    const result = buildOgDescription("tasks", { assignee: "John" });
    expect(result).toContain("Assignee: John");
  });

  it("includes tester for test-sessions when no assignee", () => {
    const result = buildOgDescription("test-sessions", { tester: "Jane" });
    expect(result).toContain("Tester: Jane");
  });

  it("includes project when available", () => {
    const result = buildOgDescription("tasks", { project: "QA Hub" });
    expect(result).toContain("Project: QA Hub");
  });

  it("joins multiple fields with middle dot separator", () => {
    const result = buildOgDescription("tasks", { status: "doing", priority: "P1", assignee: "John" });
    expect(result).toBe("Status: doing · Priority: P1 · Assignee: John");
  });

  it("returns empty string when no metadata fields are present", () => {
    const result = buildOgDescription("tasks", { id: 1, title: "Some task" });
    expect(result).toBe("");
  });

  it("truncates description to max 200 characters with ellipsis", () => {
    const longItem = {
      status: "in_progress_with_very_long_status_name",
      priority: "P0_critical_highest_priority_level",
      assignee: "A Very Long Name That Goes On And On And On",
      project: "A Super Long Project Name That Exceeds Normal Lengths Significantly More",
    };
    const result = buildOgDescription("tasks", longItem);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result).toMatch(/\.\.\.$/);
  });

  it("does not truncate descriptions under 200 characters", () => {
    const result = buildOgDescription("tasks", { status: "doing", priority: "P1" });
    expect(result).toBe("Status: doing · Priority: P1");
    expect(result).not.toMatch(/\.\.\.$/);
  });

  it("ignores non-string field values", () => {
    const result = buildOgDescription("tasks", { status: 123, priority: null, assignee: undefined });
    expect(result).toBe("");
  });
});


describe("generateMetadata", () => {
  describe("item-specific tags with ?view param", () => {
    it("returns item-specific OG tags when ?view={id} is present and item exists", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
        name: "Test User",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Task");
      mocks.dbGet.mockResolvedValueOnce({
        id: 42,
        title: "Fix login bug",
        status: "doing",
        priority: "P1",
        assignee: "John",
        company: "acme",
      });

      const result = await generateMetadata({
        params: Promise.resolve({ module: "tasks" }),
        searchParams: Promise.resolve({ view: "42" }),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("[Tasks] Fix login bug");
      expect(openGraph.title).toBe("[Tasks] Fix login bug");
      expect(openGraph.description).toContain("Status: doing");
      expect(openGraph.description).toContain("Priority: P1");
      expect(openGraph.url).toBe("/tasks?view=42");
      expect(openGraph.type).toBe("article");
      expect(openGraph.siteName).toBe("Aksora");
    });

    it("uses caseName for test-cases module title", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
        name: "Test User",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("TestCase");
      mocks.dbGet.mockResolvedValueOnce({
        id: 10,
        caseName: "Valid Login Test",
        status: "Passed",
        company: "acme",
      });

      const result = await generateMetadata({
        params: Promise.resolve({ module: "test-cases" }),
        searchParams: Promise.resolve({ view: "10" }),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("[Test Cases] Valid Login Test");
      expect(openGraph.title).toBe("[Test Cases] Valid Login Test");
    });

    it("falls back to module-level metadata when item is not found", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
        name: "Test User",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Bug");
      mocks.dbGet.mockResolvedValueOnce(undefined);

      const result = await generateMetadata({
        params: Promise.resolve({ module: "bugs" }),
        searchParams: Promise.resolve({ view: "999" }),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("Bugs - Aksora");
      expect(openGraph.title).toBe("Bugs - Aksora");
      expect(openGraph.description).toBe("View and manage bugs");
      expect(openGraph.type).toBe("website");
    });

    it("falls back to module-level metadata when view param is non-numeric", async () => {
      const result = await generateMetadata({
        params: Promise.resolve({ module: "tasks" }),
        searchParams: Promise.resolve({ view: "abc" }),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("Tasks - Aksora");
      expect(openGraph.type).toBe("website");
    });
  });

  describe("module-level tags without ?view param", () => {
    it("returns module-level OG tags when no ?view param is present", async () => {
      const result = await generateMetadata({
        params: Promise.resolve({ module: "bugs" }),
        searchParams: Promise.resolve({}),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("Bugs - Aksora");
      expect(openGraph.title).toBe("Bugs - Aksora");
      expect(openGraph.description).toBe("View and manage bugs");
      expect(openGraph.type).toBe("website");
      expect(openGraph.siteName).toBe("Aksora");
    });

    it("returns module-level OG tags for test-plans module", async () => {
      const result = await generateMetadata({
        params: Promise.resolve({ module: "test-plans" }),
        searchParams: Promise.resolve({}),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("Test Plans - Aksora");
      expect(openGraph.title).toBe("Test Plans - Aksora");
      expect(openGraph.description).toBe("View and manage test plans");
    });

    it("returns generic title for invalid module", async () => {
      const result = await generateMetadata({
        params: Promise.resolve({ module: "invalid-module" }),
        searchParams: Promise.resolve({}),
      });

      expect(result.title).toBe("Aksora");
    });

    it("handles missing searchParams gracefully", async () => {
      const result = await generateMetadata({
        params: Promise.resolve({ module: "tasks" }),
      });
      const openGraph = getOpenGraph(result);

      expect(result.title).toBe("Tasks - Aksora");
      expect(openGraph.type).toBe("website");
    });
  });
});
