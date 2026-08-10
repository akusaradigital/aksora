import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  breadcrumb: vi.fn(({ crumbs }: { crumbs: Array<{ label: string }> }) => (
    <nav>{crumbs.map((crumb) => crumb.label).join(" / ")}</nav>
  )),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/layout/breadcrumb", () => ({
  Breadcrumb: mocks.breadcrumb,
}));

vi.mock("@/components/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { SuiteDetail } from "@/app/test-suites/[token]/suite-detail";

describe("SuiteDetail", () => {
  it("renders suite overview, cases, and session tabs", () => {
    const html = renderToStaticMarkup(
      <SuiteDetail
        suite={{
          id: "s1",
          title: "Checkout Suite",
          status: "active",
          assignee: "Rina",
          notes: "",
          publicToken: "suite-token",
          testPlanId: "plan-1",
        }}
        cases={[
          { id: 1, tcId: "TC-1", caseName: "Login works", typeCase: "Positive", status: "Passed", priority: "High", actualResult: "", preCondition: "", testStep: "", expectedResult: "" },
          { id: 2, tcId: "TC-2", caseName: "Reset fails", typeCase: "Negative", status: "Failed", priority: "Medium", actualResult: "", preCondition: "", testStep: "", expectedResult: "" },
        ]}
        sessions={[
          { id: 10, date: "2026-04-30", tester: "Rina", sprint: "Sprint 1", project: "QA Hub", totalCases: 2, passed: 1, failed: 1, blocked: 0, result: "failed", notes: "" },
          { id: 9, date: "2026-04-29", tester: "Budi", sprint: "Sprint 1", project: "QA Hub", totalCases: 2, passed: 2, failed: 0, blocked: 0, result: "passed", notes: "" },
        ]}
        plan={{
          id: "plan-1",
          title: "Release Plan",
          project: "QA Hub",
          sprint: "Sprint 1",
          publicToken: "plan-token",
        }}
      />,
    );

    expect(html).toContain("Checkout Suite");
    expect(html).toContain("Test Cases (2)");
    expect(html).toContain("Session History (2)");
    expect(html).toContain("Manage Cases");
    expect(html).toContain("Search cases");
    expect(html).toContain("Login works");
    expect(mocks.breadcrumb).toHaveBeenCalled();
    expect(mocks.breadcrumb.mock.calls[0][0].crumbs.map((crumb: { label: string }) => crumb.label)).toEqual([
      "Dashboard",
      "Test Suites",
      "Checkout Suite",
    ]);
  });
});

