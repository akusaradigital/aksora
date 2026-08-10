import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dbGet: vi.fn(),
  getAccessScope: vi.fn(),
  getTableName: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: { get: mocks.dbGet },
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
  getTableName: mocks.getTableName,
}));

vi.mock("@/lib/modules", () => ({
  moduleOrder: [
    "tasks",
    "bugs",
    "test-cases",
    "test-plans",
    "test-sessions",
    "test-suites",
    "meeting-notes",
    "assignees",
    "sprints",
    "users",
    "deployments",
  ],
}));

import { GET } from "@/app/api/items/[module]/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeParams(module: string, id: string) {
  return { params: Promise.resolve({ module, id }) };
}

describe("GET /api/items/[module]/[id]", () => {
  describe("successful item fetch", () => {
    it("returns item for valid module and ID within same company", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Task");
      mocks.dbGet.mockResolvedValueOnce({
        id: 42,
        title: "Fix login bug",
        company: "acme",
        status: "open",
        deletedAt: null,
      });

      const response = await GET(
        new Request("http://localhost/api/items/tasks/42"),
        makeParams("tasks", "42"),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.item).toEqual({
        id: 42,
        title: "Fix login bug",
        company: "acme",
        status: "open",
        deletedAt: null,
      });
      expect(mocks.dbGet).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM "Task"'),
        [42, "acme"],
      );
    });

    it("returns item for admin user without company filter", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "admin",
        company: "",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "",
        isAdmin: true,
        where: "",
        andWhere: "",
        params: [],
      });
      mocks.getTableName.mockReturnValueOnce("Bug");
      mocks.dbGet.mockResolvedValueOnce({
        id: 10,
        title: "Admin bug",
        company: "other-co",
        deletedAt: null,
      });

      const response = await GET(
        new Request("http://localhost/api/items/bugs/10"),
        makeParams("bugs", "10"),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.item.id).toBe(10);
      // Admin queries should only pass [id], no company param
      expect(mocks.dbGet).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM "Bug"'),
        [10],
      );
    });
  });

  describe("404 response for non-existent item", () => {
    it("returns 404 when item does not exist at all", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Task");
      // First query: item not found for this company
      mocks.dbGet.mockResolvedValueOnce(undefined);
      // Second query: item doesn't exist anywhere either
      mocks.dbGet.mockResolvedValueOnce(undefined);

      const response = await GET(
        new Request("http://localhost/api/items/tasks/999"),
        makeParams("tasks", "999"),
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });

    it("returns 404 when item is soft-deleted (not found by query)", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Task");
      // Query includes AND "deletedAt" IS NULL, so soft-deleted items won't be found
      mocks.dbGet.mockResolvedValueOnce(undefined);
      // Second query: item doesn't exist anywhere either (also filtered by deletedAt)
      mocks.dbGet.mockResolvedValueOnce(undefined);

      const response = await GET(
        new Request("http://localhost/api/items/tasks/5"),
        makeParams("tasks", "5"),
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("not_found");
    });
  });

  describe("403 response for cross-company access", () => {
    it("returns 403 when item exists but belongs to another company", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Bug");
      // First query: item not found for user's company
      mocks.dbGet.mockResolvedValueOnce(undefined);
      // Second query: item exists in another company
      mocks.dbGet.mockResolvedValueOnce({ id: 7 });

      const response = await GET(
        new Request("http://localhost/api/items/bugs/7"),
        makeParams("bugs", "7"),
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("access_denied");
    });
  });

  describe("400 response for invalid module key", () => {
    it("returns 400 for unrecognized module key", async () => {
      const response = await GET(
        new Request("http://localhost/api/items/invalid-module/1"),
        makeParams("invalid-module", "1"),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_module");
    });

    it("returns 400 when getTableName returns empty string", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("");

      const response = await GET(
        new Request("http://localhost/api/items/tasks/1"),
        makeParams("tasks", "1"),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_module");
    });
  });

  describe("401 response for unauthenticated user", () => {
    it("returns 401 when getCurrentUser returns null", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(null);

      const response = await GET(
        new Request("http://localhost/api/items/tasks/1"),
        makeParams("tasks", "1"),
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("unauthorized");
    });
  });

  describe("token-based lookup", () => {
    it("looks up by publicToken for non-numeric ID", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: "qa",
        company: "acme",
      });
      mocks.getAccessScope.mockReturnValueOnce({
        company: "acme",
        isAdmin: false,
        where: ' WHERE "company" = ?',
        andWhere: ' AND "company" = ?',
        params: ["acme"],
      });
      mocks.getTableName.mockReturnValueOnce("Task");
      mocks.dbGet.mockResolvedValueOnce({
        id: 42,
        publicToken: "iEIj9K0xOOIGtrTii79FiA",
        title: "Fix login bug",
        company: "acme",
        deletedAt: null,
      });

      const response = await GET(
        new Request("http://localhost/api/items/tasks/iEIj9K0xOOIGtrTii79FiA"),
        makeParams("tasks", "iEIj9K0xOOIGtrTii79FiA"),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.item.publicToken).toBe("iEIj9K0xOOIGtrTii79FiA");
      expect(mocks.dbGet).toHaveBeenCalledWith(
        expect.stringContaining('"publicToken"'),
        ["iEIj9K0xOOIGtrTii79FiA", "acme"],
      );
    });

    it("returns 400 for empty token", async () => {
      const response = await GET(
        new Request("http://localhost/api/items/tasks/ "),
        makeParams("tasks", " "),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_id");
    });
  });
});
