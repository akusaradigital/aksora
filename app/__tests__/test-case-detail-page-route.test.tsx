import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getTestSuiteByToken: vi.fn(),
  getTestPlanById: vi.fn(),
  getTestCasesByScenario: vi.fn(),
  page: vi.fn(() => <div data-testid="test-case-detail-page" />),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/lib/data", () => ({
  getTestSuite: mocks.getTestSuiteByToken,
  getTestSuiteByToken: mocks.getTestSuiteByToken,
  getTestPlanById: mocks.getTestPlanById,
  getTestCasesByScenario: mocks.getTestCasesByScenario,
}));

vi.mock("@/components/test-management/test-case-detail-page", () => ({
  TestCaseDetailPage: mocks.page,
}));

import TestCaseDetailPageRoute from "@/app/test-cases/detail/[id]/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("test case detail route", () => {
  it("renders the detail page with suite and cases", async () => {
    mocks.getTestSuiteByToken.mockResolvedValueOnce({
      id: 9,
      title: "Checkout Suite",
      publicToken: "suite-token",
      testPlanId: "plan-1",
    });
    mocks.getTestPlanById.mockResolvedValueOnce({
      id: 1,
      title: "Release Plan",
      publicToken: "plan-token",
    });
    mocks.getTestCasesByScenario.mockResolvedValueOnce([
      { id: "1", title: "Case 1", status: "Passed" },
    ]);

    const element = await TestCaseDetailPageRoute({
      params: Promise.resolve({ id: "suite-token" }),
    });

    renderToStaticMarkup(element);

    expect(mocks.getTestSuiteByToken).toHaveBeenCalledWith("suite-token");
    expect(mocks.getTestPlanById).toHaveBeenCalledWith("plan-1");
    expect(mocks.getTestCasesByScenario).toHaveBeenCalledWith("9");
    expect(mocks.page).toHaveBeenCalled();

    const pageMock = mocks.page as unknown as {
      mock: { calls: Array<[{
        suiteLabel: string;
        suiteToken: string;
        plan: Record<string, unknown> | null;
        rows: Array<Record<string, unknown>>;
      }]> };
    };
    const props = pageMock.mock.calls[0]![0];
    expect(props.suiteLabel).toBe("Checkout Suite");
    expect(props.suiteToken).toBe("suite-token");
    expect(props.plan).toEqual({
      id: 1,
      title: "Release Plan",
      publicToken: "plan-token",
    });
    expect(props.rows).toEqual([{ id: 1, title: "Case 1", status: "Passed" }]);
  });

  it("rejects missing tokens", async () => {
    await expect(
      TestCaseDetailPageRoute({
        params: Promise.resolve({ id: "" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("rejects missing suite", async () => {
    mocks.getTestSuiteByToken.mockResolvedValueOnce(null);

    await expect(
      TestCaseDetailPageRoute({
        params: Promise.resolve({ id: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

