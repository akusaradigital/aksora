import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  getTaskResults: vi.fn().mockResolvedValue([]),
  getBugResults: vi.fn().mockResolvedValue([]),
  getPlanResults: vi.fn().mockResolvedValue([]),
  getSuiteResults: vi.fn().mockResolvedValue([]),
  getTestCaseResults: vi.fn().mockResolvedValue([]),
  getAssigneeResults: vi.fn().mockResolvedValue([]),
  getUserResults: vi.fn().mockResolvedValue([]),
  getActivityResults: vi.fn().mockResolvedValue([]),
  getSessionResults: vi.fn().mockResolvedValue([]),
  getMeetingResults: vi.fn().mockResolvedValue([]),
  getSprintResults: vi.fn().mockResolvedValue([]),
  getDeploymentResults: vi.fn().mockResolvedValue([]),
  getScope: vi.fn(() => "all"),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isAdminUser: mocks.isAdminUser,
}));

vi.mock("../search-query-builders", () => ({
  getTaskResults: mocks.getTaskResults,
  getBugResults: mocks.getBugResults,
  getPlanResults: mocks.getPlanResults,
  getSuiteResults: mocks.getSuiteResults,
  getTestCaseResults: mocks.getTestCaseResults,
  getAssigneeResults: mocks.getAssigneeResults,
  getUserResults: mocks.getUserResults,
  getActivityResults: mocks.getActivityResults,
  getSessionResults: mocks.getSessionResults,
  getMeetingResults: mocks.getMeetingResults,
  getSprintResults: mocks.getSprintResults,
  getDeploymentResults: mocks.getDeploymentResults,
}));

vi.mock("../search-helpers", () => ({
  SECTION_LABELS: {},
  SCOPE_LABELS: { all: "All" },
  getScope: mocks.getScope,
}));

import { GET } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ company: "acme", role: "qa" });
  mocks.isAdminUser.mockReturnValue(false);
  mocks.getScope.mockReturnValue("all");
});

describe("/api/search", () => {
  it("skips secondary searches for short queries", async () => {
    const request = new NextRequest("https://example.com/api/search?q=abc&scope=all");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.getTaskResults).toHaveBeenCalled();
    expect(mocks.getBugResults).toHaveBeenCalled();
    expect(mocks.getSessionResults).not.toHaveBeenCalled();
    expect(mocks.getMeetingResults).not.toHaveBeenCalled();
    expect(mocks.getSprintResults).not.toHaveBeenCalled();
    expect(mocks.getDeploymentResults).not.toHaveBeenCalled();
  });

  it("runs secondary searches for longer queries", async () => {
    const request = new NextRequest("https://example.com/api/search?q=abcd&scope=all");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.getSessionResults).toHaveBeenCalled();
    expect(mocks.getMeetingResults).toHaveBeenCalled();
    expect(mocks.getSprintResults).toHaveBeenCalled();
    expect(mocks.getDeploymentResults).toHaveBeenCalled();
  });
});
