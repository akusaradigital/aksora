import { describe, expect, it } from "vitest";
import { isStandaloneRoute, matchesSegment } from "@/lib/route-utils";

describe("route-utils", () => {
  it("matches segment boundaries correctly", () => {
    expect(matchesSegment("/report", "/report")).toBe(true);
    expect(matchesSegment("/report/tok123", "/report")).toBe(true);
    expect(matchesSegment("/reports", "/report")).toBe(false);
    expect(matchesSegment("/reports/workload", "/report")).toBe(false);
  });

  it("identifies standalone marketing and documentation pages", () => {
    expect(isStandaloneRoute("/")).toBe(true);
    expect(isStandaloneRoute("/docs/api")).toBe(true);
    expect(isStandaloneRoute("/docs")).toBe(true);
    expect(isStandaloneRoute("/docs/sdk")).toBe(true);
    expect(isStandaloneRoute("/features")).toBe(true);
    expect(isStandaloneRoute("/pricing")).toBe(true);
    expect(isStandaloneRoute("/about")).toBe(true);
    expect(isStandaloneRoute("/blog")).toBe(true);
    expect(isStandaloneRoute("/blog/hello-world")).toBe(true);
    expect(isStandaloneRoute("/contact")).toBe(true);
    expect(isStandaloneRoute("/privacy")).toBe(true);
    expect(isStandaloneRoute("/security")).toBe(true);
    expect(isStandaloneRoute("/demo")).toBe(true);
  });

  it("identifies auth and account recovery standalone pages", () => {
    expect(isStandaloneRoute("/login")).toBe(true);
    expect(isStandaloneRoute("/register")).toBe(true);
    expect(isStandaloneRoute("/reset-password")).toBe(true);
    expect(isStandaloneRoute("/onboarding")).toBe(true);
    expect(isStandaloneRoute("/invite/abc123token")).toBe(true);
  });

  it("identifies public reports and tokens as standalone", () => {
    expect(isStandaloneRoute("/report/rep_123")).toBe(true);
    expect(isStandaloneRoute("/report/run/run_456")).toBe(true);
    expect(isStandaloneRoute("/v/token789")).toBe(true);
  });

  it("identifies superadmin routes as standalone", () => {
    expect(isStandaloneRoute("/admin/overview")).toBe(true);
    expect(isStandaloneRoute("/admin/companies/12")).toBe(true);
    expect(isStandaloneRoute("/admin/email-templates")).toBe(true);
  });

  it("classifies internal app workspace routes as non-standalone (must have sidebar and app shell)", () => {
    expect(isStandaloneRoute("/dashboard")).toBe(false);
    expect(isStandaloneRoute("/tasks")).toBe(false);
    expect(isStandaloneRoute("/bugs")).toBe(false);
    expect(isStandaloneRoute("/sprints")).toBe(false);
    expect(isStandaloneRoute("/work-logs")).toBe(false);
    expect(isStandaloneRoute("/test-cases")).toBe(false);
    expect(isStandaloneRoute("/test-plans")).toBe(false);
    expect(isStandaloneRoute("/test-suites")).toBe(false);
    expect(isStandaloneRoute("/test-execution")).toBe(false);
    expect(isStandaloneRoute("/settings")).toBe(false);
    expect(isStandaloneRoute("/settings/api-keys")).toBe(false);
    expect(isStandaloneRoute("/reports")).toBe(false);
    expect(isStandaloneRoute("/reports/workload")).toBe(false);
    expect(isStandaloneRoute("/reports/sprint-burndown")).toBe(false);
    expect(isStandaloneRoute("/gantt")).toBe(false);
    expect(isStandaloneRoute("/standup")).toBe(false);
    expect(isStandaloneRoute("/notes")).toBe(false);
    expect(isStandaloneRoute("/vault")).toBe(false);
  });

  it("handles null, empty, or trailing slash inputs gracefully", () => {
    expect(isStandaloneRoute(null)).toBe(false);
    expect(isStandaloneRoute("")).toBe(false);
    expect(isStandaloneRoute("/docs/api/")).toBe(true);
    expect(isStandaloneRoute("/dashboard/")).toBe(false);
  });
});
