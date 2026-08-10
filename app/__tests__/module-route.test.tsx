import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { moduleOrder } from "@/lib/modules";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  moduleWorkspace: vi.fn(() => <div data-testid="module-workspace" />),
  getModuleRowsPage: vi.fn(async (module: string): Promise<any> => {
    if (module === "users") {
      return {
        rows: [
          { id: 1, name: "Alice", email: "alice@example.com", role: "pm", company: "acme" },
        ],
        total: 1,
      };
    }
    return { rows: [], total: 0 };
  }),
  getAssigneeOptions: vi.fn(async () => [
    { value: "Rina", label: "Rina" },
    { value: "Budi", label: "Budi" },
  ]),
  getProjectOptions: vi.fn(async () => []),
  getTestPlanReferenceRows: vi.fn(async () => [
    { id: "1", title: "Plan A", project: "Acme", publicToken: "tok", sprint: "Sprint 1" },
  ]),
  getTestCaseStatsBySuiteIds: vi.fn(async (): Promise<any> => new Map<string, { passed: number; failed: number; total: number }>()),
  getTestSuitesByPlanIds: vi.fn(async (): Promise<any> => []),
  getModuleRows: vi.fn(async (module: string): Promise<any> => {
    if (module === "users") {
      return [
        { id: 1, name: "Alice", email: "alice@example.com", role: "pm", company: "acme" },
      ];
    }
    if (module === "deployments") {
      return [
        { id: 1, version: "v1.0.4" },
        { id: 2, version: "v1.0.3" },
      ];
    }
    if (module === "assignees") {
      return [
        { id: 1, name: "Rina" },
        { id: 2, name: "Budi" },
      ];
    }
    return [];
  }),
  getCurrentUser: vi.fn(async () => ({ id: 1, name: "PM", role: "pm", company: "acme", email: "pm@example.com" })),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/components/module/module-workspace", () => ({
  ModuleWorkspace: mocks.moduleWorkspace,
}));

vi.mock("@/lib/data", () => ({
  getModuleRows: mocks.getModuleRows,
  getModuleRowsPage: mocks.getModuleRowsPage,
  getAssigneeOptions: mocks.getAssigneeOptions,
  getProjectOptions: mocks.getProjectOptions,
  getTestPlanReferenceRows: mocks.getTestPlanReferenceRows,
  getTestCaseStatsBySuiteIds: mocks.getTestCaseStatsBySuiteIds,
  getTestSuitesByPlanIds: mocks.getTestSuitesByPlanIds,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import ModulePage from "@/app/[module]/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("module route", () => {
  it("has configured module paths", () => {
    expect(moduleOrder.length).toBeGreaterThan(0);
    expect(moduleOrder[0]).toBeTruthy();
  });

  it("passes loaded data and query params to ModuleWorkspace", async () => {
    const element = await ModulePage({
      params: Promise.resolve({ module: "users" }),
      searchParams: Promise.resolve({ company: "acme", preset: ["x", "y"] }),
    });

    renderToStaticMarkup(element);

    expect(mocks.getModuleRowsPage).toHaveBeenCalledWith("users", 1, 10, "", undefined, "");
    expect(mocks.getAssigneeOptions).toHaveBeenCalled();
    expect(mocks.moduleWorkspace).toHaveBeenCalled();

    const moduleWorkspaceMock = mocks.moduleWorkspace as unknown as {
      mock: { calls: Array<[{
      module: string;
      rows: Array<Record<string, unknown>>;
      currentPage: number;
      totalPages: number;
      totalItems: number;
      initialFormValues: Record<string, string>;
      user: Record<string, unknown>;
    }]> };
    };
    const props = moduleWorkspaceMock.mock.calls[0]![0];
    expect(props.module).toBe("users");
    expect(props.rows).toEqual([
      { id: 1, name: "Alice", email: "alice@example.com", role: "pm", company: "acme" },
    ]);
    expect(props.initialFormValues).toEqual({
      company: "acme",
      preset: "x",
    });
    expect(props.user).toEqual({
      id: 1,
      name: "PM",
      role: "pm",
      company: "acme",
      email: "pm@example.com",
    });
  });

  it("loads test suite metadata and row spans", async () => {
    mocks.getModuleRowsPage.mockResolvedValueOnce({
      rows: [
        { id: 11, title: "Suite B", testPlanId: 1, publicToken: "suite-b", project: "Acme" },
        { id: 12, title: "Suite A", testPlanId: 1, publicToken: "suite-a", project: "Acme" },
      ],
      total: 2,
    });
    mocks.getTestCaseStatsBySuiteIds.mockResolvedValueOnce(
      new Map([
        ["11", { passed: 4, failed: 1, total: 5 }],
        ["12", { passed: 2, failed: 0, total: 2 }],
      ]),
    );

    const element = await ModulePage({
      params: Promise.resolve({ module: "test-suites" }),
      searchParams: Promise.resolve({ page: "1" }),
    });

    renderToStaticMarkup(element);

    const props = (mocks.moduleWorkspace as unknown as { mock: { calls: Array<[Record<string, any>]> } }).mock.calls[0]![0];
    expect(mocks.getTestPlanReferenceRows).toHaveBeenCalled();
    expect(mocks.getTestCaseStatsBySuiteIds).toHaveBeenCalledWith([11, 12]);
    expect(props.relatedOptions).toMatchObject({
      testPlanId: [
        { value: "1", label: "Plan A" },
      ],
    });
    expect(props.rows).toEqual([
      {
        id: 12,
        title: "Suite A",
        testPlanId: 1,
        publicToken: "suite-a",
        token: "suite-a",
        project: "Acme",
        testPlanLabel: "Plan A",
        testPlanToken: "tok",
        projectLabel: "Acme",
        testSuiteId: "12",
        passed: 2,
        failed: 0,
        total: 2,
        testPlanRowSpan: 2,
      },
      {
        id: 11,
        title: "Suite B",
        testPlanId: 1,
        publicToken: "suite-b",
        token: "suite-b",
        project: "Acme",
        testPlanLabel: "Plan A",
        testPlanToken: "tok",
        projectLabel: "Acme",
        testSuiteId: "11",
        passed: 4,
        failed: 1,
        total: 5,
        testPlanRowSpan: 0,
      },
    ]);
  });

  it("pre-fills deployment version from the latest deployment", async () => {
    mocks.getModuleRowsPage.mockResolvedValueOnce({
      rows: [
        { id: 1, date: "2026-05-06", version: "v1.0.4", project: "VanApp" },
      ],
      total: 1,
    });

    const element = await ModulePage({
      params: Promise.resolve({ module: "deployments" }),
      searchParams: Promise.resolve({ page: "1" }),
    });

    renderToStaticMarkup(element);

    const props = (mocks.moduleWorkspace as unknown as { mock: { calls: Array<[Record<string, any>]> } }).mock.calls[0]![0];
    expect(props.initialFormValues).toMatchObject({
      version: "v1.0.5",
    });
  });

  it("loads related suites for test plans and clamps page overflow", async () => {
    mocks.getModuleRowsPage.mockResolvedValueOnce({
      rows: [
        { id: 7, title: "Plan X", project: "Beta" },
      ],
      total: 1,
    });
    mocks.getTestSuitesByPlanIds.mockResolvedValueOnce([
      { id: 21, testPlanId: 7, title: "Suite 1", publicToken: "suite-1" },
      { id: 22, testPlanId: 7, title: "Suite 2", publicToken: "suite-2" },
    ]);
    mocks.getModuleRowsPage.mockResolvedValueOnce({
      rows: [
        { id: 7, title: "Plan X", project: "Beta" },
      ],
      total: 1,
    });

    const element = await ModulePage({
      params: Promise.resolve({ module: "test-plans" }),
      searchParams: Promise.resolve({ page: "5" }),
    });

    renderToStaticMarkup(element);

    const props = (mocks.moduleWorkspace as unknown as { mock: { calls: Array<[Record<string, any>]> } }).mock.calls[0]![0];
    expect(mocks.getModuleRowsPage).toHaveBeenNthCalledWith(1, "test-plans", 5, 10, "", undefined, "");
    expect(mocks.getModuleRowsPage).toHaveBeenNthCalledWith(2, "test-plans", 1, 10, "", undefined, "");
    expect(mocks.getTestSuitesByPlanIds).toHaveBeenCalledWith([7]);
    expect(props.currentPage).toBe(1);
    expect(props.rows).toEqual([
      {
        id: 7,
        title: "Plan X",
        project: "Beta",
        relatedSuites: [
          { id: 21, title: "Suite 1", token: "suite-1", publicToken: "suite-1" },
          { id: 22, title: "Suite 2", token: "suite-2", publicToken: "suite-2" },
        ],
        projectRowSpan: 1,
      },
    ]);
  });

  it("limits assignee and developer options to self for non-admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 2,
      name: "Rina",
      email: "rina@example.com",
      role: "pm",
      company: "acme",
    });

    await ModulePage({
      params: Promise.resolve({ module: "bugs" }),
      searchParams: Promise.resolve({}),
    }).then((element) => renderToStaticMarkup(element));

    const props = (mocks.moduleWorkspace as unknown as { mock: { calls: Array<[Record<string, any>]> } }).mock.calls.at(-1)![0];
    expect(props.relatedOptions.suggestedDev).toEqual([
      { value: "Rina", label: "Rina (pm)" },
    ]);
    expect(props.relatedOptions.assignee).toBeUndefined();
  });

  it("keeps full assignee options for admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
      company: "acme",
    });

    await ModulePage({
      params: Promise.resolve({ module: "tasks" }),
      searchParams: Promise.resolve({}),
    }).then((element) => renderToStaticMarkup(element));

    const props = (mocks.moduleWorkspace as unknown as { mock: { calls: Array<[Record<string, any>]> } }).mock.calls.at(-1)![0];
    expect(props.relatedOptions.assignee).toEqual([
      { value: "Rina", label: "Rina" },
      { value: "Budi", label: "Budi" },
    ]);
  });

  it("throws notFound for unknown modules", async () => {
    await expect(
      ModulePage({
        params: Promise.resolve({ module: "unknown" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});


