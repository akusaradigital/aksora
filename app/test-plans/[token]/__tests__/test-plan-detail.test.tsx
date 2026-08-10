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

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>("@/lib/utils");
  return actual;
});

import { TestPlanDetail } from "@/app/test-plans/[token]/test-plan-detail";

describe("TestPlanDetail", () => {
  it("renders plan overview and suite controls", () => {
    const html = renderToStaticMarkup(
      <TestPlanDetail
        plan={{
          id: "1",
          title: "Release Plan",
          project: "QA Hub",
          sprint: "Sprint 1",
          assignee: "Rina",
          status: "active",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
          notes: "",
          scope: "Regression",
        }}
        suites={[
          {
            id: "s1",
            token: "suite-1",
            title: "Smoke Suite",
            assignee: "Rina",
            status: "active",
            notes: "",
            cases: [
              { id: 1, tcId: "TC-1", caseName: "Login works", typeCase: "Positive", status: "Passed", priority: "High", actualResult: "", preCondition: "", testStep: "", expectedResult: "" },
              { id: 2, tcId: "TC-2", caseName: "Reset fails", typeCase: "Negative", status: "Failed", priority: "Medium", actualResult: "", preCondition: "", testStep: "", expectedResult: "" },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain("Release Plan");
    expect(html).toContain("Search suites or cases");
    expect(html).toContain("Needs Attention");
    expect(html).toContain("Smoke Suite");
    expect(html).toContain("Manage");
    expect(html).toContain("Execute");
    expect(html).toContain("1 suites");
    expect(html).toContain("2 cases");
    expect(mocks.breadcrumb).toHaveBeenCalled();
    expect(mocks.breadcrumb.mock.calls[0][0].crumbs.map((crumb: { label: string }) => crumb.label)).toEqual([
      "Dashboard",
      "Test Plans",
      "Release Plan",
    ]);
  });
});

