import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbQuery: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ db: { query: mocks.dbQuery } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dbQuery.mockResolvedValue([]);
});

describe("GET /api/dashboard/timesheet-status", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 5 Mon-Fri days with targetMinutes = 480", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      name: "Alice",
      company: "acme",
      role: "qa",
      workspaceId: 1,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.targetMinutes).toBe(480);
    expect(data.days).toHaveLength(5);
    expect(data.days.map((d: { label: string }) => d.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  });

  it("aggregates today's and week's duration correctly", async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    mocks.getCurrentUser.mockResolvedValueOnce({
      name: "Alice",
      company: "acme",
      role: "qa",
      workspaceId: 1,
    });
    mocks.dbQuery.mockResolvedValueOnce([
      { date: todayIso, durationMinutes: 240 },
      { date: todayIso, durationMinutes: 120 },
    ]);

    const res = await GET();
    const { data } = await res.json();
    expect(data.todayMinutes).toBe(360);
    expect(data.weekTotalMinutes).toBe(360);
  });
});
