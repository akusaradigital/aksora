import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  pageShell: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
  executionSuiteCards: vi.fn(({ inProgress, ready }: { inProgress: Array<{ planName: string }>; ready: Array<{ planName: string }> }) => (
    <div data-testid="execution-suite-cards">
      {inProgress.map((suite) => (suite.planName === "Standalone" ? "Standalone Execution" : suite.planName)).join(" / ")}
      {"|"}
      {ready.map((suite) => (suite.planName === "Standalone" ? "Standalone Execution" : suite.planName)).join(" / ")}
    </div>
  )),
  dbQuery: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: mocks.dbQuery,
  },
}));

vi.mock("@/lib/auth-core", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/app/test-execution/execution-suite-cards", () => ({
  ExecutionSuiteCards: mocks.executionSuiteCards,
}));

import TestExecutionPage from "@/app/test-execution/page";

describe("test execution page", () => {
  it("groups active suites by plan and renders execution groups", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, company: "acme", role: "qa" });
    mocks.dbQuery
      .mockResolvedValueOnce([
        { id: 1, title: "Checkout Suite", status: "active", assignee: "", notes: "", publicToken: "suite-1", testPlanId: "10", caseCount: 3 },
        { id: 3, title: "Standalone Suite", status: "active", assignee: "", notes: "", publicToken: "suite-3", testPlanId: null, caseCount: 2 },
      ])
      .mockResolvedValueOnce([
        { id: 11, suiteId: 1, runNumber: 7, status: "in-progress", tester: "Rina", passed: 1, failed: 0, blocked: 0, totalCases: 3, startedAt: "2026-05-18T00:00:00Z", completedAt: null },
      ])
      .mockResolvedValueOnce([
        { id: 10, title: "Plan Alpha", project: "QA Hub" },
      ]);

    const element = await TestExecutionPage();
    const html = renderToStaticMarkup(element);

    expect(mocks.dbQuery).toHaveBeenCalledTimes(3);
    expect(html).toContain("Plan Alpha");
    expect(html).toContain("Standalone Execution");
    expect(mocks.executionSuiteCards).toHaveBeenCalledTimes(1);
    const props = (mocks.pageShell as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0]![0];
    expect(props).toEqual(expect.objectContaining({
      title: "Execution Center",
      description: "Start new runs, continue in-progress executions, or review past results.",
    }));
  });
});

