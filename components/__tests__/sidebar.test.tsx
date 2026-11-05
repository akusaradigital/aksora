import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-execution/session-1",
  useSearchParams: () => new URLSearchParams(),
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

    // Section A: Main Navigation (Dashboard, Projects)
    expect(groups[0].title).toBe("");
    expect(groups[0].items.map((i) => i.href)).toEqual(["/dashboard", "/projects"]);

    // Section B: Test Management (Test Repository, Test Execution)
    expect(groups[1].title).toBe("Test Management");
    expect(groups[1].items.map((i) => i.href)).toEqual([
      "/test-cases",
      "/test-execution",
    ]);

    // Section C: Work Tracking (Tasks & Sprints, Bugs, Team & Logs)
    expect(groups[2].title).toBe("Work Tracking");
    expect(groups[2].items.map((i) => i.href)).toEqual([
      "/tasks",
      "/bugs",
      "/work-logs",
    ]);

    // Section D: Reports & Analytics
    expect(groups[3].title).toBe("Reports & Analytics");
    expect(groups[3].items.map((i) => i.href)).toEqual([
      "/reports",
    ]);

    // Section E: Personal Tools
    expect(groups[4].title).toBe("Personal Tools");
    expect(groups[4].items.map((i) => i.href)).toEqual([
      "/notes",
    ]);

    // Section F: System Settings
    expect(groups[5].title).toBe("System Settings");
    expect(groups[5].items.map((i) => i.href)).toEqual([
      "/settings",
    ]);

    // Ensure no duplicate routes across all groups
    const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    const uniqueHrefs = new Set(allHrefs);
    expect(allHrefs.length).toBe(uniqueHrefs.size);
    expect(allHrefs.length).toBe(10);
  });
});

