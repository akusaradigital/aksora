import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  badge: vi.fn(({ value }: { value: string }) => <span>{value}</span>),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/badge", () => ({
  Badge: mocks.badge,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
  formatDisplayText: (value: string) => value,
}));

import { TestCaseLibrary } from "@/app/test-cases/test-case-library";

describe("TestCaseLibrary", () => {
  it("groups cases by suite and renders the default selected suite", () => {
    const html = renderToStaticMarkup(
      <TestCaseLibrary
        cases={[
          {
            id: 1,
            tcId: "TS-010",
            caseName: "Payment gateway works",
            typeCase: "Positive",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            status: "Passed",
            priority: "High",
            evidence: "",
            suiteTitle: "Payment Suite",
            suiteToken: "suite-10",
            suiteStatus: "active",
            planTitle: "Sprint 3",
            planProject: "ECOSHOP WEB",
            testSuiteId: 1,
          },
          {
            id: 2,
            tcId: "TS-002",
            caseName: "Login works",
            typeCase: "Negative",
            preCondition: "",
            testStep: "",
            expectedResult: "",
            actualResult: "",
            status: "Failed",
            priority: "Medium",
            evidence: "",
            suiteTitle: "Login Suite",
            suiteToken: "suite-2",
            suiteStatus: "draft",
            planTitle: "Sprint 1",
            planProject: "ECOSHOP WEB",
            testSuiteId: 2,
          },
        ]}
      />,
    );

    expect(html.indexOf("Login Suite")).toBeGreaterThan(-1);
    expect(html.indexOf("Payment Suite")).toBeGreaterThan(-1);
    expect(html.indexOf("Login Suite")).toBeLessThan(html.indexOf("Payment Suite"));
    expect(html).toContain("Login works");
    expect(html).toContain("Failed");
  });
});
