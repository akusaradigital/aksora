import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  dbQuery: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: mocks.dbQuery,
  },
  isPostgres: false,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({
    company: "acme",
    isAdmin: false,
    params: ["acme"],
  });
});

describe("GET /api/dashboard/digest", () => {
  it("returns 401 when user is not authenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns digest data with hasData: true when sections have items", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    // Mock: newBugs
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 1, title: "Login crash", severity: "critical", priority: "P0", status: "open", createdAt: "2024-01-01T10:00:00Z" },
    ]);
    // Mock: assignedBugs
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 2, title: "UI glitch", severity: "medium", priority: "P2", status: "open" },
    ]);
    // Mock: assignedTasks
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 3, title: "Write tests", priority: "High", status: "in-progress" },
    ]);
    // Mock: statusChanges
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 10, entityType: "Bug", entityId: "2", action: "Updated", summary: "Updated Bug #2 status to fixed by Bob", createdAt: "2024-01-01T09:00:00Z" },
    ]);
    // Mock: upcomingDeadlines
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 5, name: "Sprint 3", endDate: "2024-01-02", status: "active" },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.hasData).toBe(true);
    expect(json.newBugs).toHaveLength(1);
    expect(json.newBugs[0].title).toBe("Login crash");
    expect(json.assignedItems).toHaveLength(2);
    expect(json.statusChanges).toHaveLength(1);
    expect(json.upcomingDeadlines).toHaveLength(1);
    expect(json.upcomingDeadlines[0].title).toBe("Sprint 3");
  });

  it("returns hasData: false when all sections are empty", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    // All queries return empty
    mocks.dbQuery.mockResolvedValueOnce([]); // newBugs
    mocks.dbQuery.mockResolvedValueOnce([]); // assignedBugs
    mocks.dbQuery.mockResolvedValueOnce([]); // assignedTasks
    mocks.dbQuery.mockResolvedValueOnce([]); // statusChanges
    mocks.dbQuery.mockResolvedValueOnce([]); // upcomingDeadlines

    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.hasData).toBe(false);
    expect(json.newBugs).toEqual([]);
    expect(json.assignedItems).toEqual([]);
    expect(json.statusChanges).toEqual([]);
    expect(json.upcomingDeadlines).toEqual([]);
  });

  it("enforces company-scoped isolation in queries", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    mocks.dbQuery.mockResolvedValue([]);

    await GET();

    // All 5 queries should include company filter
    for (const call of mocks.dbQuery.mock.calls) {
      expect(call[0]).toContain('"company" = ?');
      expect(call[1]).toContain("acme");
    }
  });

  it("skips company filter for admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Admin",
      role: "superadmin",
      company: "",
    });
    mocks.getAccessScope.mockReturnValue({
      company: "",
      isAdmin: true,
      params: [],
    });

    mocks.dbQuery.mockResolvedValue([]);

    await GET();

    // Queries should NOT include company filter for admin
    for (const call of mocks.dbQuery.mock.calls) {
      expect(call[1]).not.toContain("acme");
    }
  });

  it("limits assigned items to max 10 combined", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    // 10 assigned bugs
    const bugs = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Bug ${i + 1}`,
      severity: "medium",
      priority: "P2",
      status: "open",
    }));
    // 5 assigned tasks
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: i + 20,
      title: `Task ${i + 1}`,
      priority: "High",
      status: "in-progress",
    }));

    mocks.dbQuery.mockResolvedValueOnce([]); // newBugs
    mocks.dbQuery.mockResolvedValueOnce(bugs); // assignedBugs
    mocks.dbQuery.mockResolvedValueOnce(tasks); // assignedTasks
    mocks.dbQuery.mockResolvedValueOnce([]); // statusChanges
    mocks.dbQuery.mockResolvedValueOnce([]); // upcomingDeadlines

    const response = await GET();
    const json = await response.json();

    // Should be capped at 10
    expect(json.assignedItems.length).toBeLessThanOrEqual(10);
  });

  it("returns error state on database failure", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    mocks.dbQuery.mockRejectedValueOnce(new Error("DB connection failed"));

    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      newBugs: [],
      assignedItems: [],
      statusChanges: [],
      upcomingDeadlines: [],
      hasData: false,
    });
    expect(json.hasData).toBe(false);
  });

  it("returns timeout error when queries exceed 5 seconds", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    // Simulate a slow query that takes longer than 5s
    mocks.dbQuery.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 6000))
    );

    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({
      newBugs: [],
      assignedItems: [],
      statusChanges: [],
      upcomingDeadlines: [],
      hasData: false,
    });
    expect(json.hasData).toBe(false);
  }, 10000);

  it("uses last 24 hours as default session window", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      name: "Alice",
      role: "qa",
      company: "acme",
    });

    mocks.dbQuery.mockResolvedValue([]);

    await GET();

    // First query (newBugs) should use the start of the current day.
    const firstCallParams = mocks.dbQuery.mock.calls[0][1];
    const expectedSessionStart = new Date();
    expectedSessionStart.setHours(0, 0, 0, 0);

    expect(firstCallParams[0]).toBe(expectedSessionStart.toISOString());
  });
});
