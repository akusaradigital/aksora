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
import { QualityHealthScore, getScoreColor, getTooltipText } from "@/components/dashboard/quality-health-score";

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

describe("QualityHealthScore", () => {
  describe("rendering", () => {
    it("does not render when qualityHealthScore prop is undefined", () => {
      const html = renderToStaticMarkup(
        <Dashboard {...baseProps} />,
      );
      expect(html).not.toContain("Health Score");
      expect(html).not.toContain("quality-health-score");
    });

    it("renders circular progress indicator with score", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 75,
            components: { resolutionRate: 80, inverseCriticalRatio: 90, testPassRate: 60 },
          }}
        />,
      );
      expect(html).toContain("75");
      expect(html).toContain("Health Score");
      expect(html).toContain("quality-health-score");
    });

    it("renders SVG circle elements for progress indicator", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 50,
            components: { resolutionRate: 50, inverseCriticalRatio: 50, testPassRate: 50 },
          }}
        />,
      );
      expect(html).toContain("<circle");
      expect(html).toContain("stroke-dasharray");
      expect(html).toContain("stroke-dashoffset");
    });
  });

  describe("color bands", () => {
    it("applies red color when score < 50", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 30,
            components: { resolutionRate: 30, inverseCriticalRatio: 30, testPassRate: 30 },
          }}
        />,
      );
      expect(html).toContain("text-red-500");
      expect(html).toContain("stroke-red-500");
    });

    it("applies red color at score 0", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 0,
            components: { resolutionRate: 0, inverseCriticalRatio: 0, testPassRate: 0 },
          }}
        />,
      );
      expect(html).toContain("text-red-500");
    });

    it("applies red color at score 49", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 49,
            components: { resolutionRate: 49, inverseCriticalRatio: 49, testPassRate: 49 },
          }}
        />,
      );
      expect(html).toContain("text-red-500");
      expect(html).toContain("stroke-red-500");
    });

    it("applies amber color when score is 50", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 50,
            components: { resolutionRate: 50, inverseCriticalRatio: 50, testPassRate: 50 },
          }}
        />,
      );
      expect(html).toContain("text-amber-500");
      expect(html).toContain("stroke-amber-500");
    });

    it("applies amber color when score is 74", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 74,
            components: { resolutionRate: 74, inverseCriticalRatio: 74, testPassRate: 74 },
          }}
        />,
      );
      expect(html).toContain("text-amber-500");
      expect(html).toContain("stroke-amber-500");
    });

    it("applies emerald color when score is 75", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 75,
            components: { resolutionRate: 75, inverseCriticalRatio: 75, testPassRate: 75 },
          }}
        />,
      );
      expect(html).toContain("text-emerald-500");
      expect(html).toContain("stroke-emerald-500");
    });

    it("applies emerald color when score is 100", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 100,
            components: { resolutionRate: 100, inverseCriticalRatio: 100, testPassRate: 100 },
          }}
        />,
      );
      expect(html).toContain("text-emerald-500");
      expect(html).toContain("stroke-emerald-500");
    });
  });

  describe("null component handling", () => {
    it("displays score as 0 when all inputs are null", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 0,
            components: { resolutionRate: null, inverseCriticalRatio: null, testPassRate: null },
          }}
        />,
      );
      // Score should display 0
      expect(html).toContain(">0</span>");
      expect(html).toContain("text-red-500");
    });

    it("renders with partial null components", () => {
      const html = renderToStaticMarkup(
        <QualityHealthScore
          qualityHealthScore={{
            score: 40,
            components: { resolutionRate: 80, inverseCriticalRatio: null, testPassRate: null },
          }}
        />,
      );
      expect(html).toContain("40");
    });
  });

  describe("getScoreColor helper", () => {
    it("returns red for scores below 50", () => {
      expect(getScoreColor(0)).toBe("text-red-500");
      expect(getScoreColor(25)).toBe("text-red-500");
      expect(getScoreColor(49)).toBe("text-red-500");
    });

    it("returns amber for scores 50–74", () => {
      expect(getScoreColor(50)).toBe("text-amber-500");
      expect(getScoreColor(60)).toBe("text-amber-500");
      expect(getScoreColor(74)).toBe("text-amber-500");
    });

    it("returns emerald for scores 75+", () => {
      expect(getScoreColor(75)).toBe("text-emerald-500");
      expect(getScoreColor(90)).toBe("text-emerald-500");
      expect(getScoreColor(100)).toBe("text-emerald-500");
    });
  });

  describe("getTooltipText helper", () => {
    it("returns 'No data available' when all components are null", () => {
      const result = getTooltipText({
        resolutionRate: null,
        inverseCriticalRatio: null,
        testPassRate: null,
      });
      expect(result).toBe("No data available for score computation");
    });

    it("returns missing metrics list when some components are null", () => {
      const result = getTooltipText({
        resolutionRate: 80,
        inverseCriticalRatio: null,
        testPassRate: null,
      });
      expect(result).toBe("Missing: inverse critical ratio, test pass rate");
    });

    it("returns single missing metric", () => {
      const result = getTooltipText({
        resolutionRate: 80,
        inverseCriticalRatio: 90,
        testPassRate: null,
      });
      expect(result).toBe("Missing: test pass rate");
    });

    it("returns null when all components have values", () => {
      const result = getTooltipText({
        resolutionRate: 80,
        inverseCriticalRatio: 90,
        testPassRate: 70,
      });
      expect(result).toBeNull();
    });

    it("lists resolution rate when it is null", () => {
      const result = getTooltipText({
        resolutionRate: null,
        inverseCriticalRatio: 90,
        testPassRate: 70,
      });
      expect(result).toBe("Missing: resolution rate");
    });
  });

  describe("integration with Dashboard", () => {
    it("wires QualityHealthScore into the WeekPulse section", () => {
      // QualityHealthScore is a ssr:false dynamic component, so server markup shows
      // its loading skeleton, not the client-rendered circle. Assert the container
      // that only renders when qualityHealthScore is provided.
      const html = renderToStaticMarkup(
        <Dashboard
          {...baseProps}
          qualityHealthScore={{
            score: 82,
            components: { resolutionRate: 90, inverseCriticalRatio: 85, testPassRate: 70 },
          }}
        />,
      );
      expect(html).toContain("This Week");
      expect(html).toContain('h-24  border border-gray-200 bg-gray-50');
    });

    it("does not render qualityHealthScore container when prop is undefined", () => {
      const html = renderToStaticMarkup(
        <Dashboard {...baseProps} />,
      );
      expect(html).not.toMatch(/Quality Health Score/);
    });
  });
});


