import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-execution/session-1",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => ({
    dict: {
      sidebar: {
        dashboard: "Dashboard",
        groupTestManagement: "Test Management",
        testPlans: "Test Plans",
        testSuites: "Test Suites",
        testCases: "Test Cases",
        testSessions: "Test Sessions",
        groupWorkTracking: "Work Tracking",
        tasks: "Tasks",
        bugs: "Bugs",
        sprints: "Sprints",
        workLog: "Work Log",
        groupDocumentation: "Documentation",
        dailyStandup: "Daily Standup",
        meetingNotes: "Meeting Notes",
        activityLog: "Activity Log",
        groupReports: "Reports",
        report: "Report",
        testCoverage: "Test Coverage",
        flakyTests: "Flaky Tests",
        testGapAnalysis: "Test Gap Analysis",
        deploymentLog: "Deployment Log",
        workloadHeatmap: "Workload Heatmap",
        ganttTimeline: "Gantt / Timeline",
        groupSystemSettings: "System Settings",
        settings: "Settings",
        apiKeys: "API Keys",
        support: "Support",
        collapse: "Collapse",
        expand: "Expand",
      },
    },
    locale: "en",
    setLocale: () => {},
  }),
}));

import { Sidebar } from "@/components/layout/sidebar";

describe("Sidebar", () => {
  it("marks test execution active for execution detail routes", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        collapsed={false}
        onToggle={() => {}}
        userRole="admin"
      />,
    );

    expect(html).toContain('href="/test-execution"');
    expect(html).toMatch(/href="\/test-execution"[^>]*bg-sky-50[\s\S]*?Test Sessions/);
    expect(html).not.toMatch(/href="\/test-suites"[^>]*bg-sky-50/);
  });
});

