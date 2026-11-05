import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let currentPathname = "/test-cases";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { SectionSubNav } from "@/components/layout/section-sub-nav";

describe("SectionSubNav", () => {
  it("renders Test Management tabs when on /test-cases", () => {
    currentPathname = "/test-cases";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/test-cases"');
    expect(html).toContain('href="/test-suites"');
    expect(html).toContain('href="/test-plans"');
    expect(html).toContain('href="/exploratory"');
    expect(html).toContain("Test Cases");
    expect(html).toContain("Test Suites");
  });

  it("renders Tasks & Sprints tabs when on /tasks", () => {
    currentPathname = "/tasks";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/sprints"');
    expect(html).toContain('href="/gantt"');
    expect(html).toContain("Tasks Board");
    expect(html).toContain("Sprints Backlog");
    expect(html).toContain("Gantt Timeline");
  });

  it("renders Team & Logs tabs when on /work-logs", () => {
    currentPathname = "/work-logs";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/work-logs"');
    expect(html).toContain('href="/standup"');
    expect(html).toContain('href="/meeting-notes"');
    expect(html).toContain('href="/activity-log"');
  });

  it("renders Reports tabs when on /reports/test-coverage", () => {
    currentPathname = "/reports/test-coverage";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toContain('href="/reports/test-coverage"');
    expect(html).toContain('href="/reports/sprint-burndown"');
    expect(html).toContain('href="/reports/flaky-tests"');
    expect(html).toContain('href="/reports/test-gap"');
    expect(html).toContain('href="/reports/workload"');
    expect(html).toContain('href="/deployments"');
    expect(html).toContain('href="/weekly-report"');
  });

  it("returns null on standalone pages like /dashboard or /projects", () => {
    currentPathname = "/dashboard";
    const html = renderToStaticMarkup(<SectionSubNav />);
    expect(html).toBe("");

    currentPathname = "/projects";
    const htmlProjects = renderToStaticMarkup(<SectionSubNav />);
    expect(htmlProjects).toBe("");
  });
});
