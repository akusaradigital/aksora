import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  breadcrumb: vi.fn(({ crumbs }: { crumbs: Array<{ label: string }> }) => (
    <nav>{crumbs.map((crumb) => crumb.label).join(" / ")}</nav>
  )),
  badge: vi.fn(({ value }: { value: string }) => <span>{value}</span>),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/layout/breadcrumb", () => ({
  Breadcrumb: mocks.breadcrumb,
}));

vi.mock("@/components/badge", () => ({
  Badge: mocks.badge,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
  formatDate: (value: string) => value,
  formatDisplayText: (value: string) => value,
}));

import { TestPlanDetail } from "@/app/test-plans/[token]/test-plan-detail";

describe("TestPlanDetail", () => {
  it("renders plan summary and suite actions", () => {
    const html = renderToStaticMarkup(
      <TestPlanDetail
        plan={{
          id: "1",
          title: "Release Plan",
          project: "QA Hub",
          sprint: "Sprint 5",
          assignee: "Rina",
          status: "active",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
          notes: "Regression",
          scope: "Core flows",
        }}
        suites={[
          {
            id: "s1",
            publicToken: "suite-1",
            title: "Checkout Suite",
            assignee: "Rina",
            status: "active",
            notes: "Main flow",
            cases: [
              {
                id: 1,
                tcId: "TC-1",
                caseName: "Login works",
                typeCase: "Positive",
                status: "Passed",
                priority: "High",
                actualResult: "",
                preCondition: "",
                testStep: "",
                expectedResult: "",
              },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain("Release Plan");
    expect(html).toContain("Checkout Suite");
    expect(html).toContain("Manage");
    expect(html).toContain("Execute");
    expect(mocks.breadcrumb).toHaveBeenCalled();
  });
});

