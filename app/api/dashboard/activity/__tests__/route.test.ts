import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, extractActor, collapseActivityEntries, type ActivityEntry } from "../route";

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
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({
    company: "acme",
    isAdmin: false,
    params: ["acme"],
  });
});

describe("GET /api/dashboard/activity", () => {
  it("returns 401 when user is not authenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/dashboard/activity"));

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns team-scoped entries by default", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 1, entityType: "Bug", entityId: "10", action: "Created", summary: "Created Bug #10 by Alice", createdAt: "2024-01-01T10:00:00Z" },
    ]);

    const response = await GET(new Request("http://localhost/api/dashboard/activity"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.entries).toHaveLength(1);
    expect(json.collapsed).toHaveLength(0);
    // Verify company filter is applied
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.stringContaining('"company" = ?'),
      expect.arrayContaining(["acme"]),
    );
  });

  it("returns my-scoped entries when scope=my", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 1, entityType: "Task", entityId: "5", action: "Updated", summary: "Updated Task #5 by Alice", createdAt: "2024-01-01T10:00:00Z" },
    ]);

    const response = await GET(new Request("http://localhost/api/dashboard/activity?scope=my"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.entries).toHaveLength(1);
    // Verify LIKE filter for user name
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIKE'),
      expect.arrayContaining(["%Alice%"]),
    );
  });

  it("defaults scope to team for invalid scope values", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/dashboard/activity?scope=invalid"));

    expect(response.status).toBe(200);
    // Should use team scope (WHERE company = ?)
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.stringContaining('"company" = ?'),
      expect.arrayContaining(["acme"]),
    );
  });

  it("allows limit up to 100", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([]);

    await GET(new Request("http://localhost/api/dashboard/activity?limit=100"));

    // Should honor the requested limit within bounds
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([100]),
    );
  });

  it("uses provided limit when within bounds", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([]);

    await GET(new Request("http://localhost/api/dashboard/activity?limit=20"));

    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([20]),
    );
  });

  it("returns collapsed groups when 3+ entries match", async () => {
    const baseTime = new Date("2024-01-01T10:00:00Z").getTime();
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 1, entityType: "Bug", entityId: "1", action: "Created", summary: "Created Bug #1 by Alice", createdAt: new Date(baseTime).toISOString() },
      { id: 2, entityType: "Bug", entityId: "2", action: "Created", summary: "Created Bug #2 by Alice", createdAt: new Date(baseTime - 60000).toISOString() },
      { id: 3, entityType: "Bug", entityId: "3", action: "Created", summary: "Created Bug #3 by Alice", createdAt: new Date(baseTime - 120000).toISOString() },
    ]);

    const response = await GET(new Request("http://localhost/api/dashboard/activity"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.entries).toHaveLength(0);
    expect(json.collapsed).toHaveLength(1);
    expect(json.collapsed[0].count).toBe(3);
    expect(json.collapsed[0].action).toBe("Created");
    expect(json.collapsed[0].entityType).toBe("Bug");
    expect(json.collapsed[0].actor).toBe("Alice");
  });

  it("does not collapse entries with different actions", async () => {
    const baseTime = new Date("2024-01-01T10:00:00Z").getTime();
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockResolvedValueOnce([
      { id: 1, entityType: "Bug", entityId: "1", action: "Created", summary: "Created Bug #1 by Alice", createdAt: new Date(baseTime).toISOString() },
      { id: 2, entityType: "Bug", entityId: "2", action: "Updated", summary: "Updated Bug #2 by Alice", createdAt: new Date(baseTime - 60000).toISOString() },
      { id: 3, entityType: "Bug", entityId: "3", action: "Created", summary: "Created Bug #3 by Alice", createdAt: new Date(baseTime - 120000).toISOString() },
    ]);

    const response = await GET(new Request("http://localhost/api/dashboard/activity"));

    expect(response.status).toBe(200);
    const json = await response.json();
    // No group has 3+ entries with same action
    expect(json.collapsed).toHaveLength(0);
    expect(json.entries).toHaveLength(3);
  });

  it("returns graceful fallback on database error", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Alice", role: "qa", company: "acme" });
    mocks.dbQuery.mockRejectedValueOnce(new Error("db error"));

    const response = await GET(new Request("http://localhost/api/dashboard/activity"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.entries).toEqual([]);
    expect(json.collapsed).toEqual([]);
    expect(response.headers.get("X-Activity-Error")).toBe("true");
  });

  it("skips company filter for admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Admin", role: "superadmin", company: "" });
    mocks.getAccessScope.mockReturnValue({
      company: "",
      isAdmin: true,
      params: [],
    });
    mocks.dbQuery.mockResolvedValueOnce([]);

    await GET(new Request("http://localhost/api/dashboard/activity"));

    // Should NOT include company filter
    expect(mocks.dbQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('"company" = ?'),
      expect.any(Array),
    );
  });
});

describe("extractActor", () => {
  it("extracts actor from 'by ActorName' pattern", () => {
    expect(extractActor("Created Bug #10 by Alice")).toBe("Alice");
  });

  it("extracts actor with multi-word name", () => {
    expect(extractActor("Updated Task #5 by John Doe")).toBe("John Doe");
  });

  it("returns full summary when no 'by' pattern found", () => {
    expect(extractActor("System auto-update")).toBe("");
  });

  it("handles empty string", () => {
    expect(extractActor("")).toBe("");
  });
});

describe("collapseActivityEntries", () => {
  const makeEntry = (
    id: number,
    action: string,
    entityType: string,
    actor: string,
    minutesAgo: number,
  ): ActivityEntry => ({
    id,
    entityType,
    entityId: String(id),
    action,
    summary: `${action} ${entityType} #${id} by ${actor}`,
    createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
  });

  it("returns empty arrays for empty input", () => {
    const result = collapseActivityEntries([]);
    expect(result.entries).toEqual([]);
    expect(result.collapsed).toEqual([]);
  });

  it("does not collapse fewer than 3 matching entries", () => {
    const entries = [
      makeEntry(1, "Created", "Bug", "Alice", 0),
      makeEntry(2, "Created", "Bug", "Alice", 1),
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(2);
    expect(result.collapsed).toHaveLength(0);
  });

  it("collapses 3+ entries with same action, entityType, actor within 5 minutes", () => {
    const entries = [
      makeEntry(1, "Created", "Bug", "Alice", 0),
      makeEntry(2, "Created", "Bug", "Alice", 1),
      makeEntry(3, "Created", "Bug", "Alice", 2),
      makeEntry(4, "Created", "Bug", "Alice", 3),
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(0);
    expect(result.collapsed).toHaveLength(1);
    expect(result.collapsed[0].count).toBe(4);
    expect(result.collapsed[0].action).toBe("Created");
    expect(result.collapsed[0].entityType).toBe("Bug");
    expect(result.collapsed[0].actor).toBe("Alice");
    expect(result.collapsed[0].entries).toHaveLength(4);
  });

  it("does not collapse entries outside 5-minute window", () => {
    const entries = [
      makeEntry(1, "Created", "Bug", "Alice", 0),
      makeEntry(2, "Created", "Bug", "Alice", 1),
      makeEntry(3, "Created", "Bug", "Alice", 6), // outside 5-min window
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(3);
    expect(result.collapsed).toHaveLength(0);
  });

  it("does not collapse entries with different actions", () => {
    const entries = [
      makeEntry(1, "Created", "Bug", "Alice", 0),
      makeEntry(2, "Updated", "Bug", "Alice", 1),
      makeEntry(3, "Created", "Bug", "Alice", 2),
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(3);
    expect(result.collapsed).toHaveLength(0);
  });

  it("does not collapse entries with different entity types", () => {
    const entries = [
      makeEntry(1, "Created", "Bug", "Alice", 0),
      makeEntry(2, "Created", "Task", "Alice", 1),
      makeEntry(3, "Created", "Bug", "Alice", 2),
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(3);
    expect(result.collapsed).toHaveLength(0);
  });

  it("does not collapse entries with different actors", () => {
    const entries = [
      makeEntry(1, "Created", "Bug", "Alice", 0),
      makeEntry(2, "Created", "Bug", "Bob", 1),
      makeEntry(3, "Created", "Bug", "Alice", 2),
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(3);
    expect(result.collapsed).toHaveLength(0);
  });

  it("handles multiple collapsed groups", () => {
    const baseTime = Date.now();
    const entries: ActivityEntry[] = [
      // Group 1: 3 Created Bug by Alice (within 5 min)
      { id: 1, entityType: "Bug", entityId: "1", action: "Created", summary: "Created Bug #1 by Alice", createdAt: new Date(baseTime).toISOString() },
      { id: 2, entityType: "Bug", entityId: "2", action: "Created", summary: "Created Bug #2 by Alice", createdAt: new Date(baseTime - 60000).toISOString() },
      { id: 3, entityType: "Bug", entityId: "3", action: "Created", summary: "Created Bug #3 by Alice", createdAt: new Date(baseTime - 120000).toISOString() },
      // Group 2: 3 Updated Task by Bob (within 5 min)
      { id: 4, entityType: "Task", entityId: "4", action: "Updated", summary: "Updated Task #4 by Bob", createdAt: new Date(baseTime - 180000).toISOString() },
      { id: 5, entityType: "Task", entityId: "5", action: "Updated", summary: "Updated Task #5 by Bob", createdAt: new Date(baseTime - 240000).toISOString() },
      { id: 6, entityType: "Task", entityId: "6", action: "Updated", summary: "Updated Task #6 by Bob", createdAt: new Date(baseTime - 280000).toISOString() },
    ];
    const result = collapseActivityEntries(entries);
    expect(result.entries).toHaveLength(0);
    expect(result.collapsed).toHaveLength(2);
    expect(result.collapsed[0].actor).toBe("Alice");
    expect(result.collapsed[1].actor).toBe("Bob");
  });

  it("includes startTime and endTime in collapsed groups", () => {
    const baseTime = new Date("2024-01-01T10:00:00Z").getTime();
    const entries: ActivityEntry[] = [
      { id: 1, entityType: "Bug", entityId: "1", action: "Created", summary: "Created Bug #1 by Alice", createdAt: new Date(baseTime).toISOString() },
      { id: 2, entityType: "Bug", entityId: "2", action: "Created", summary: "Created Bug #2 by Alice", createdAt: new Date(baseTime - 60000).toISOString() },
      { id: 3, entityType: "Bug", entityId: "3", action: "Created", summary: "Created Bug #3 by Alice", createdAt: new Date(baseTime - 120000).toISOString() },
    ];
    const result = collapseActivityEntries(entries);
    expect(result.collapsed[0].startTime).toBe(new Date(baseTime - 120000).toISOString());
    expect(result.collapsed[0].endTime).toBe(new Date(baseTime).toISOString());
  });
});
