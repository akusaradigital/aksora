import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  dbQuery: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/data-helpers", () => ({ getAccessScope: mocks.getAccessScope }));
vi.mock("@/lib/db", () => ({ db: { query: mocks.dbQuery } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({ andWhere: ' AND "company" = ?', params: ["acme"] });
  mocks.dbQuery.mockResolvedValue([]);
});

describe("GET /api/work-logs/today-activity", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Unauthorized" });
  });

  it("returns structured data with date when no activity", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ name: "Alice", email: "alice@acme.com", company: "acme", role: "qa" });
    const res = await GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.activities).toHaveProperty("bugs");
    expect(data.activities).toHaveProperty("testSessions");
    expect(data.activities).toHaveProperty("standupNotes");
    expect(Array.isArray(data.suggestions)).toBe(true);
    expect(Array.isArray(data.todayLogs)).toBe(true);
    // fallback suggestion always added when no real activity
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it("builds suggestions from test sessions and bugs", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ name: "Alice", email: "alice@acme.com", company: "acme", role: "qa" });
    const today = new Date().toISOString().slice(0, 10);
    mocks.dbQuery
      // bugs (query 1)
      .mockResolvedValueOnce([{ id: 1, title: "Login crash", project: "Auth", severity: "critical", status: "open", updatedAt: new Date().toISOString(), suggestedDev: "Alice" }])
      // test sessions (query 2)
      .mockResolvedValueOnce([{ id: 2, project: "Auth", tester: "Alice", scope: "Login flow", totalCases: "10", passed: "9", failed: "1", blocked: "0", result: "pass", date: today }])
      // standup/meeting notes (query 3)
      .mockResolvedValueOnce([])
      // today's logs (query 4)
      .mockResolvedValueOnce([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.activities.bugs).toHaveLength(1);
    expect(data.activities.testSessions).toHaveLength(1);
    // one from session + one from bug (no fallback since suggestions exist)
    expect(data.suggestions.length).toBe(2);
    expect(data.suggestions.some((s: { category: string }) => s.category === "testing")).toBe(true);
    expect(data.suggestions.some((s: { category: string }) => s.category === "bugfix")).toBe(true);
  });
});
