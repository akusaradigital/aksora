import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-execution/session-1",
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
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
        projects: "Projects",
        groupTeamWorkspace: "Team Workspace",
        groupPersonalTools: "Personal Tools",
        groupReportsAnalytics: "Reports & Analytics",
        notes: "Notes",
        passwordManager: "Password Manager",
        aiSettings: "AI & Models",
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
import { getGroups } from "@/components/layout/sidebar-nav";

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

  it("reorganizes groups into the exact required structure and ordering", () => {
    const groups = getGroups({
      dashboard: "Dashboard",
      groupTestManagement: "Test Management",
      projects: "Projects",
      testPlans: "Test Plans",
      testSuites: "Test Suites",
      testCases: "Test Cases",
      testSessions: "Test Sessions",
      groupWorkTracking: "Work Tracking",
      tasks: "Tasks",
      bugs: "Bugs",
      sprints: "Sprints",
      workLog: "Work Log",
      ganttTimeline: "Gantt / Timeline",
      groupDocumentation: "Team Workspace",
      groupTeamWorkspace: "Team Workspace",
      dailyStandup: "Daily Standup",
      meetingNotes: "Meeting Notes",
      activityLog: "Activity Log",
      groupPersonal: "Personal Tools",
      groupPersonalTools: "Personal Tools",
      notes: "Notes",
      passwordManager: "Password Manager",
      groupReports: "Reports & Analytics",
      groupReportsAnalytics: "Reports & Analytics",
      report: "Report",
      testCoverage: "Test Coverage",
      flakyTests: "Flaky Tests",
      testGapAnalysis: "Test Gap Analysis",
      deploymentLog: "Deployment Log",
      workloadHeatmap: "Workload Heatmap",
      groupSystemSettings: "System Settings",
      settings: "Settings",
      aiSettings: "AI & Models",
      apiKeys: "API Keys",
      support: "Support",
    } as unknown as Parameters<typeof getGroups>[0]);

    // Section A: Main Navigation (Dashboard)
    expect(groups[0].title).toBe("");
    expect(groups[0].items.map((i) => i.href)).toEqual(["/dashboard"]);

    // Section B: Test Management (Projects, Test Plans, Test Suites, Test Cases, Test Sessions, Exploratory)
    expect(groups[1].title).toBe("Test Management");
    expect(groups[1].items.map((i) => i.href)).toEqual([
      "/projects",
      "/test-plans",
      "/test-suites",
      "/test-cases",
      "/test-execution",
      "/exploratory",
    ]);

    // Section C: Work Tracking (Tasks, Bugs, Sprints, Work Log, Gantt / Timeline)
    expect(groups[2].title).toBe("Work Tracking");
    expect(groups[2].items.map((i) => i.href)).toEqual([
      "/tasks",
      "/bugs",
      "/sprints",
      "/work-logs",
      "/gantt",
    ]);

    // Section D: Team Workspace (Daily Standup, Meeting Notes, Activity Log)
    expect(groups[3].title).toBe("Team Workspace");
    expect(groups[3].items.map((i) => i.href)).toEqual([
      "/standup",
      "/meeting-notes",
      "/activity-log",
    ]);

    // Section E: Personal Tools (Notes, Password Manager)
    expect(groups[4].title).toBe("Personal Tools");
    expect(groups[4].items.map((i) => i.href)).toEqual([
      "/notes",
      "/vault",
    ]);

    // Section F: Reports & Analytics (Report, Sprint Burndown, Test Coverage, Flaky Tests, Test Gap Analysis, Deployment Log, Workload Heatmap)
    expect(groups[5].title).toBe("Reports & Analytics");
    expect(groups[5].items.map((i) => i.href)).toEqual([
      "/weekly-report",
      "/reports/sprint-burndown",
      "/reports/test-coverage",
      "/reports/flaky-tests",
      "/reports/test-gap",
      "/deployments",
      "/reports/workload",
    ]);

    // Section G: System Settings (Settings, AI & Models, API Keys, Support)
    expect(groups[6].title).toBe("System Settings");
    expect(groups[6].items.map((i) => i.href)).toEqual([
      "/settings",
      "/settings/ai",
      "/settings/api-keys",
      "/settings/support",
    ]);

    // Ensure no duplicate routes across all groups
    const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    const uniqueHrefs = new Set(allHrefs);
    expect(allHrefs.length).toBe(uniqueHrefs.size);
    expect(allHrefs.length).toBe(28);
  });
});

