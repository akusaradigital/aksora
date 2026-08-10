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

import { SuiteDetail } from "@/app/test-suites/[token]/suite-detail";

describe("SuiteDetail", () => {
  it("renders suite summary and execution links", () => {
    const html = renderToStaticMarkup(
      <SuiteDetail
        suite={{
          id: "s1",
          title: "Checkout Suite",
          status: "active",
          assignee: "Rina",
          notes: "Main flow",
          publicToken: "suite-1",
          testPlanId: "plan-1",
        }}
        cases={[
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
        ]}
        sessions={[]}
        plan={{
          id: "plan-1",
          title: "Release Plan",
          project: "QA Hub",
          sprint: "Sprint 5",
          publicToken: "",
        }}
      />,
    );

    expect(html).toContain("Checkout Suite");
    expect(html).toContain("Release Plan");
    expect(html).toContain("Execute Suite");
    expect(html).toContain("Manage Cases");
    expect(mocks.breadcrumb).toHaveBeenCalled();
  });
});

