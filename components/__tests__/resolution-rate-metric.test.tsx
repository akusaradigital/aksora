import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/layout/breadcrumb", () => ({
  Breadcrumb: () => <nav />,
}));

vi.mock("@/components/badge", () => ({
  Badge: () => <span />,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
}));

vi.mock("@/components/responsive-container", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/skeleton", () => ({
  ChartSkeleton: () => <div />,
}));

vi.mock("@/components/dashboard/dashboard-drawer", () => ({
  DashboardDrawer: () => <div />,
}));

vi.mock("@/components/dashboard/dashboard-standup-modal", () => ({
  DashboardStandupModal: () => <div />,
}));

import { Dashboard } from "@/components/dashboard/dashboard";

const baseProps = {
  metrics: [
    { label: "Open Tasks", value: 3, caption: "" },
    { label: "Bug Entries", value: 2, caption: "" },
    { label: "Test Cases", value: 4, caption: "" },
  ],
  distribution: { tasks: [], bugs: [], bugByModule: [] },
  personalSuccessRate: 75,
  recent: { tasks: [], bugs: [], testCases: [] },
  bugTrendData: [],
  todayActivity: [],
  heatmap: [],
  activity: [],
};

describe("ResolutionRateMetric", () => {
  it("displays resolution rate as integer percentage with % suffix", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 85, previousWeek: 80, delta: 5 }}
      />,
    );
    expect(html).toContain("85%");
    expect(html).toContain("Resolution Rate");
  });

  it("shows N/A when rate is null (created count is zero)", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: null, previousWeek: null, delta: null }}
      />,
    );
    expect(html).toContain("N/A");
    expect(html).toContain("Resolution Rate");
  });

  it("applies amber color when rate < 70%", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 50, previousWeek: null, delta: null }}
      />,
    );
    expect(html).toContain("text-amber-500");
    expect(html).toContain("bg-amber-50");
    expect(html).toContain("50%");
  });

  it("applies emerald color when rate >= 70%", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 70, previousWeek: 60, delta: 10 }}
      />,
    );
    expect(html).toContain("text-emerald-500");
    expect(html).toContain("bg-emerald-50");
    expect(html).toContain("70%");
  });

  it("applies emerald color at exactly 70%", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 70, previousWeek: null, delta: null }}
      />,
    );
    expect(html).toContain("text-emerald-500");
  });

  it("displays positive delta as +X", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 80, previousWeek: 75, delta: 5 }}
      />,
    );
    expect(html).toContain("+5pp");
  });

  it("displays negative delta with minus sign (−)", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 60, previousWeek: 70, delta: -10 }}
      />,
    );
    // Unicode minus sign \u2212
    expect(html).toContain("\u221210pp");
  });

  it("omits delta display when delta is null", () => {
    const html = renderToStaticMarkup(
      <Dashboard
        {...baseProps}
        resolutionRate={{ current: 80, previousWeek: null, delta: null }}
      />,
    );
    expect(html).toContain("80%");
    expect(html).not.toContain("resolution-rate-delta");
  });

  it("does not render when resolutionRate prop is undefined", () => {
    const html = renderToStaticMarkup(
      <Dashboard {...baseProps} />,
    );
    expect(html).not.toContain("Resolution Rate");
  });
});


