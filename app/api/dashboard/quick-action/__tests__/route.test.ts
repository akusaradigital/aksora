import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  logActivity: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
  logActivity: mocks.logActivity,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
    run: mocks.dbRun,
  },
}));

import { PATCH } from "@/app/api/dashboard/quick-action/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/dashboard/quick-action", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({ company: "acme", isAdmin: false, andWhere: ' AND "company" = ?', params: ["acme"] });
  mocks.logActivity.mockResolvedValue(undefined);
  mocks.dbRun.mockResolvedValue(undefined);
});

describe("PATCH /api/dashboard/quick-action", () => {
  describe("authentication and authorization", () => {
    it("returns 403 when user is not authenticated", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(null);

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.code).toBe("FORBIDDEN");
    });

    it("returns 403 when user has non-admin role", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("Admin or superadmin");
    });

    it("allows admin role", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(200);
    });

    it("allows superadmin role", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "superadmin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });

      const response = await PATCH(makeRequest({ entityType: "Task", entityId: 1, action: "status", value: "done" }));

      expect(response.status).toBe(200);
    });

    it("returns 403 for fe role", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "fe", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(403);
    });

    it("returns 403 for pm role", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "pm", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(403);
    });
  });

  describe("validation", () => {
    it("returns 400 when body is invalid JSON", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });

      const response = await PATCH(new Request("http://localhost/api/dashboard/quick-action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when entityType is missing", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });

      const response = await PATCH(makeRequest({ entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when entityType is invalid", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Sprint", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityType");
    });

    it("returns 400 when action is invalid", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "delete", value: "dev@test.com" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("action");
    });

    it("returns 400 when entityId is not a positive integer", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: -1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when value is empty", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("entity not found", () => {
    it("returns 404 when entity does not exist", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce(undefined);

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 999, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.code).toBe("NOT_FOUND");
      expect(json.error).toContain("Bug not found");
    });

    it("returns 404 when Task does not exist in company scope", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce(undefined);

      const response = await PATCH(makeRequest({ entityType: "Task", entityId: 5, action: "status", value: "done" }));

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.code).toBe("NOT_FOUND");
      expect(json.error).toContain("Task not found");
    });
  });

  describe("assign action", () => {
    it("updates suggestedDev field on Bug", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "john@test.com" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"suggestedDev"'),
        ["john@test.com", 1, "acme"]
      );
    });

    it("updates assignee field on Task (Task has no suggestedDev column)", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 2 });

      const response = await PATCH(makeRequest({ entityType: "Task", entityId: 2, action: "assign", value: "jane@test.com" }));

      expect(response.status).toBe(200);
      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"assignee"'),
        ["jane@test.com", 2, "acme"]
      );
      expect(mocks.dbRun).not.toHaveBeenCalledWith(
        expect.stringContaining('"suggestedDev"'),
        ["jane@test.com", 2, "acme"]
      );
    });

    it("calls logActivity for assign action", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });

      await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "john@test.com" }));

      expect(mocks.logActivity).toHaveBeenCalledWith(
        "acme", "Bug", "1", "Updated", "Assigned Bug to john@test.com", ""
      );
    });
  });

  describe("status action", () => {
    it("updates status field on Bug", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 3 });

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 3, action: "status", value: "resolved" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"status"'),
        ["resolved", 3, "acme"]
      );
    });

    it("updates status field on Task", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "superadmin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 4 });

      const response = await PATCH(makeRequest({ entityType: "Task", entityId: 4, action: "status", value: "in-progress" }));

      expect(response.status).toBe(200);
      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"status"'),
        ["in-progress", 4, "acme"]
      );
    });

    it("calls logActivity for status action", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 3 });

      await PATCH(makeRequest({ entityType: "Bug", entityId: 3, action: "status", value: "resolved" }));

      expect(mocks.logActivity).toHaveBeenCalledWith(
        "acme", "Bug", "3", "Updated", "Changed Bug status to resolved", ""
      );
    });
  });

  describe("error handling", () => {
    it("returns 500 when db.get throws", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockRejectedValueOnce(new Error("DB connection failed"));

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe("INTERNAL_ERROR");
      expect(json.error).toBe("An unexpected error occurred");
    });

    it("returns 500 when db.run throws during update", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });
      mocks.dbRun.mockRejectedValueOnce(new Error("Write failed"));

      const response = await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("company-scoped isolation", () => {
    it("queries entity with company filter", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });

      await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(mocks.dbGet).toHaveBeenCalledWith(
        expect.stringContaining('"company" = ?'),
        [1, "acme"]
      );
    });

    it("updates entity with company filter", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "acme" });
      mocks.dbGet.mockResolvedValueOnce({ id: 1 });

      await PATCH(makeRequest({ entityType: "Bug", entityId: 1, action: "assign", value: "dev@test.com" }));

      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"company" = ?'),
        expect.arrayContaining(["acme"])
      );
    });
  });
});
