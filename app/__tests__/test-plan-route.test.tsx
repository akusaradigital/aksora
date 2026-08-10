import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getTestPlanByToken: vi.fn(),
  getTestSuitesByPlanId: vi.fn(),
  getTestCasesByScenarioIds: vi.fn(),
  detail: vi.fn(() => <div data-testid="test-plan-detail" />),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/data", () => ({
  getTestPlanByToken: mocks.getTestPlanByToken,
  getTestSuitesByPlanId: mocks.getTestSuitesByPlanId,
  getTestCasesByScenarioIds: mocks.getTestCasesByScenarioIds,
}));

vi.mock("@/app/test-plans/[token]/test-plan-detail", () => ({
  TestPlanDetail: mocks.detail,
}));

import TestPlanDetailPage from "@/app/test-plans/[token]/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("test plan route", () => {
  it("renders plan details with suites and cases", async () => {
    mocks.getTestPlanByToken.mockResolvedValueOnce({
      id: 11,
      title: "Plan A",
      project: "QA Hub",
      sprint: "Sprint 1",
      assignee: "Rina",
      status: "active",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      notes: "",
      scope: "Regression",
    });
    mocks.getTestSuitesByPlanId.mockResolvedValueOnce([
      { id: "s1", title: "Suite 1", publicToken: "suite-1" },
      { id: "s2", title: "Suite 2", publicToken: "suite-2" },
    ]);
    mocks.getTestCasesByScenarioIds.mockResolvedValueOnce({
      s1: [{ id: 1, tcId: "TC-1" }],
      s2: [{ id: 2, tcId: "TC-2" }],
    });

    const element = await TestPlanDetailPage({
      params: Promise.resolve({ token: "plan-token" }),
    });

    renderToStaticMarkup(element);

    expect(mocks.getTestPlanByToken).toHaveBeenCalledWith("plan-token");
    expect(mocks.getTestSuitesByPlanId).toHaveBeenCalledWith("11");
    expect(mocks.getTestCasesByScenarioIds).toHaveBeenCalledWith(["s1", "s2"]);
    expect(mocks.detail).toHaveBeenCalled();

    const detailMock = mocks.detail as unknown as {
      mock: { calls: Array<[{
        plan: Record<string, unknown>;
        suites: Array<Record<string, unknown> & { cases: Array<Record<string, unknown>> }>;
      }]> };
    };
    const props = detailMock.mock.calls[0]![0];
    expect(props.plan).toEqual({
      id: 11,
      title: "Plan A",
      project: "QA Hub",
      sprint: "Sprint 1",
      assignee: "Rina",
      status: "active",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
      notes: "",
      scope: "Regression",
    });
    expect(props.suites).toEqual([
      { id: "s1", title: "Suite 1", publicToken: "suite-1", cases: [{ id: 1, tcId: "TC-1" }] },
      { id: "s2", title: "Suite 2", publicToken: "suite-2", cases: [{ id: 2, tcId: "TC-2" }] },
    ]);
  });

  it("rejects missing plans", async () => {
    mocks.getTestPlanByToken.mockResolvedValueOnce(null);

    await expect(
      TestPlanDetailPage({
        params: Promise.resolve({ token: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
