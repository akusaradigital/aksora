import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dashboard/route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getDashboardData: vi.fn(),
  getBugSeverityCounts: vi.fn(),
  getTestPassRate: vi.fn(),
  computeQualityHealthScore: vi.fn(),
  getAccessScope: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data", () => ({
  getDashboardData: mocks.getDashboardData,
  getBugSeverityCounts: mocks.getBugSeverityCounts,
  getTestPassRate: mocks.getTestPassRate,
  computeQualityHealthScore: mocks.computeQualityHealthScore,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({ company: "acme", isAdmin: false });
});

describe("dashboard api", () => {
  it("returns empty dashboard when user is missing", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      metrics: expect.any(Array),
      spotlight: expect.any(Object),
    });
  });

  it("returns dashboard data", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "" });
    mocks.getDashboardData.mockResolvedValueOnce({ ok: true });
    mocks.getBugSeverityCounts.mockResolvedValueOnce({ critical: 0, high: 0, medium: 0, low: 0 });
    mocks.getTestPassRate.mockResolvedValueOnce(null);
    mocks.computeQualityHealthScore.mockReturnValueOnce(30);

    const response = await GET(new Request("http://localhost/api/dashboard?project=QA"));

    expect(mocks.getDashboardData).toHaveBeenCalledWith("QA");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.bugSeverityCounts).toBeDefined();
    // All-zero severities + null pass rate → no health score data (inverseCriticalRatio=null)
    expect(json.qualityHealthScore).toBeUndefined();
  });

  it("falls back to empty dashboard when data fetch fails", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "magnus" });
    mocks.getDashboardData.mockRejectedValueOnce(new Error("boom"));

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Dashboard-Error")).toBe("true");
    await expect(response.json()).resolves.toMatchObject({
      metrics: expect.any(Array),
      spotlight: { projectName: "No active project" },
    });
  });

  it("includes bugSeverityCounts in response when query succeeds", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    mocks.getDashboardData.mockResolvedValueOnce({ metrics: [] });
    mocks.getBugSeverityCounts.mockResolvedValueOnce({ critical: 2, high: 5, medium: 3, low: 1 });

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.bugSeverityCounts).toEqual({ critical: 2, high: 5, medium: 3, low: 1 });
  });

  it("omits bugSeverityCounts from response when query fails", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    mocks.getDashboardData.mockResolvedValueOnce({ metrics: [] });
    mocks.getBugSeverityCounts.mockRejectedValueOnce(new Error("db error"));

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.bugSeverityCounts).toBeUndefined();
    expect(json.metrics).toEqual([]);
  });

  it("includes qualityHealthScore in response with all components", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    mocks.getDashboardData.mockResolvedValueOnce({
      metrics: [],
      resolutionRate: { current: 80, previousWeek: 60, delta: 20 },
    });
    mocks.getBugSeverityCounts.mockResolvedValueOnce({ critical: 1, high: 3, medium: 5, low: 1 });
    mocks.getTestPassRate.mockResolvedValueOnce(90);
    mocks.computeQualityHealthScore.mockReturnValueOnce(78);

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.qualityHealthScore).toBeDefined();
    expect(json.qualityHealthScore.score).toBe(78);
    expect(json.qualityHealthScore.components).toEqual({
      resolutionRate: 80,
      inverseCriticalRatio: expect.any(Number),
      testPassRate: 90,
    });
  });

  it("omits qualityHealthScore when there are no bugs and no other components have data", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    mocks.getDashboardData.mockResolvedValueOnce({
      metrics: [],
      resolutionRate: { current: null, previousWeek: null, delta: null },
    });
    mocks.getBugSeverityCounts.mockResolvedValueOnce({ critical: 0, high: 0, medium: 0, low: 0 });
    mocks.getTestPassRate.mockResolvedValueOnce(null);
    mocks.computeQualityHealthScore.mockReturnValueOnce(30);

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(200);
    const json = await response.json();
    // No open bugs → inverseCriticalRatio is null; no other component has data → score omitted
    expect(json.qualityHealthScore).toBeUndefined();
  });

  it("omits qualityHealthScore when getTestPassRate throws", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    mocks.getDashboardData.mockResolvedValueOnce({ metrics: [] });
    mocks.getBugSeverityCounts.mockResolvedValueOnce({ critical: 1, high: 2, medium: 3, low: 4 });
    mocks.getTestPassRate.mockRejectedValueOnce(new Error("db error"));

    const response = await GET(new Request("http://localhost/api/dashboard"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.qualityHealthScore).toBeUndefined();
  });
});
