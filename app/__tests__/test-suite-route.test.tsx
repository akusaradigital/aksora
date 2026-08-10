import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  db: {
    query: vi.fn(),
    get: vi.fn(),
  },
  getTestSuiteByToken: vi.fn(),
  getTestCasesByScenario: vi.fn(),
  getTestPlanById: vi.fn(),
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  detail: vi.fn(() => <div data-testid="suite-detail" />),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/data", () => ({
  getTestSuiteByToken: mocks.getTestSuiteByToken,
  getTestCasesByScenario: mocks.getTestCasesByScenario,
  getTestPlanById: mocks.getTestPlanById,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isAdminUser: mocks.isAdminUser,
}));

vi.mock("@/app/test-suites/[token]/suite-detail", () => ({
  SuiteDetail: mocks.detail,
}));

import TestSuiteDetailPage from "@/app/test-suites/[token]/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ role: "pm", company: "acme" });
  mocks.isAdminUser.mockReturnValue(false);
  mocks.db.query.mockResolvedValue([]);
  mocks.db.get.mockResolvedValue(null);
});

describe("test suite route", () => {
  it("renders suite details with cases sessions and plan", async () => {
    mocks.getTestSuiteByToken.mockResolvedValueOnce({
      id: "s1",
      title: "Suite A",
      status: "active",
      assignee: "Rina",
      notes: "",
      publicToken: "suite-token",
      testPlanId: "p1",
    });
    mocks.getTestCasesByScenario.mockResolvedValueOnce([
      { id: 1, tcId: "TC-1" },
    ]);
    mocks.getTestPlanById.mockResolvedValueOnce({
      id: "p1",
      title: "Plan A",
      project: "QA Hub",
      sprint: "Sprint 1",
      publicToken: "plan-token",
    });
    mocks.db.query.mockResolvedValueOnce([
      { id: 10, date: "2026-04-30", tester: "Rina", sprint: "Sprint 1", project: "QA Hub", totalCases: 1, passed: 1, failed: 0, blocked: 0, result: "passed", notes: "" },
    ]);
    mocks.db.get.mockResolvedValueOnce({
      id: "p1",
      title: "Plan A",
      project: "QA Hub",
      sprint: "Sprint 1",
      publicToken: "plan-token",
    });

    const element = await TestSuiteDetailPage({
      params: Promise.resolve({ token: "suite-token" }),
    });

    renderToStaticMarkup(element);

    expect(mocks.getTestSuiteByToken).toHaveBeenCalledWith("suite-token");
    expect(mocks.getTestCasesByScenario).toHaveBeenCalledWith("s1");
    expect(mocks.db.query).toHaveBeenCalledWith(
      `SELECT * FROM "TestSession" WHERE "scope" = ? AND "company" = ? ORDER BY "date" DESC LIMIT 20`,
      ["Suite A", "acme"],
    );
    expect(mocks.getTestPlanById).toHaveBeenCalledWith("p1");
    expect(mocks.detail).toHaveBeenCalled();

    const detailMock = mocks.detail as unknown as {
      mock: { calls: Array<[{
        suite: Record<string, unknown>;
        cases: Array<Record<string, unknown>>;
        sessions: Array<Record<string, unknown>>;
        plan: Record<string, unknown> | null;
      }]> };
    };
    const props = detailMock.mock.calls[0]![0];
    expect(props.suite).toEqual({
      id: "s1",
      title: "Suite A",
      status: "active",
      assignee: "Rina",
      notes: "",
      publicToken: "suite-token",
      testPlanId: "p1",
    });
    expect(props.cases).toEqual([{ id: 1, tcId: "TC-1" }]);
    expect(props.sessions).toEqual([
      { id: 10, date: "2026-04-30", tester: "Rina", sprint: "Sprint 1", project: "QA Hub", totalCases: 1, passed: 1, failed: 0, blocked: 0, result: "passed", notes: "" },
    ]);
    expect(props.plan).toEqual({
      id: "p1",
      title: "Plan A",
      project: "QA Hub",
      sprint: "Sprint 1",
      publicToken: "plan-token",
    });
  });

  it("rejects missing suites", async () => {
    mocks.getTestSuiteByToken.mockResolvedValueOnce(null);

    await expect(
      TestSuiteDetailPage({
        params: Promise.resolve({ token: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

