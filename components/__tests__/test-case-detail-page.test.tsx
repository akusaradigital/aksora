import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  pageShell: vi.fn(
    ({
      eyebrow,
      title,
      description,
      actions,
      crumbs,
      children,
    }: {
      eyebrow: string;
      title: string;
      description: string;
      actions: React.ReactNode;
      crumbs?: Array<{ label: string; href?: string }>;
      children: React.ReactNode;
    }) => (
      <section>
        <h1>{eyebrow}</h1>
        <h2>{title}</h2>
        <p>{description}</p>
        <div>{crumbs?.map((crumb) => crumb.label).join(",")}</div>
        <div>{actions}</div>
        <div>{children}</div>
      </section>
    ),
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock("@/components/layout/page-shell", () => ({
  PageShell: mocks.pageShell,
}));

vi.mock("@/components/test-management/test-case-detail-editor", () => ({
  TestCaseDetailEditor: ({ suiteTitle }: { suiteTitle: string }) => (
    <div data-testid="fullstack">{suiteTitle}</div>
  ),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

import { TestCaseDetailPage } from "@/components/test-management/test-case-detail-page";

describe("TestCaseDetailPage", () => {
  it("renders the execution page shell", () => {
    mocks.pageShell.mockClear();
    const html = renderToStaticMarkup(
      <TestCaseDetailPage
        scenario={{ id: 3 }}
        rows={[{ id: 1, status: "Passed" }]}
        suiteLabel="Checkout Suite"
        suiteToken="suite-token"
        plan={{ title: "Release Plan", publicToken: "plan-token" }}
      />,
    );

    expect(html).toContain("Test Cases");
    expect(html).toContain("Checkout Suite");
    expect(html).toContain("Submit for Test Sessions");
    expect(html).toContain("data-testid=\"fullstack\"");

    expect(mocks.pageShell).toHaveBeenCalled();
    const props = mocks.pageShell.mock.calls[0]?.[0] as {
      crumbs?: Array<{ label: string }>;
    };
    expect(props.crumbs?.map((crumb) => crumb.label)).toEqual([
      "Dashboard",
      "Test Cases",
      "Detail Test Cases",
    ]);
  });
});



