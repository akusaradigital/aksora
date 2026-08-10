import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  upsertHeartbeat: vi.fn(),
  removeStalePresence: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/data", () => ({
  upsertHeartbeat: mocks.upsertHeartbeat,
  removeStalePresence: mocks.removeStalePresence,
}));

vi.mock("@/lib/db", () => ({
  db: {
    run: mocks.dbRun,
  },
}));

import { POST } from "@/app/api/dashboard/presence/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/dashboard/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({ company: "acme", isAdmin: false, andWhere: ' AND "company" = ?', params: ["acme"] });
  mocks.upsertHeartbeat.mockResolvedValue(undefined);
  mocks.removeStalePresence.mockResolvedValue(undefined);
  mocks.dbRun.mockResolvedValue(undefined);
});

describe("POST /api/dashboard/presence", () => {
  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(null);

      const response = await POST(makeRequest({ action: "heartbeat" }));

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe("UNAUTHORIZED");
      expect(json.error).toBe("Authentication required");
    });
  });

  describe("validation", () => {
    it("returns 400 when body is invalid JSON", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(new Request("http://localhost/api/dashboard/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when action is missing", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makeRequest({}));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("action");
    });

    it("returns 400 when action is invalid", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makeRequest({ action: "invalid" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("action");
    });
  });

  describe("heartbeat action", () => {
    it("calls upsertHeartbeat with company, userId, and userName", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 5, name: "Alice", role: "qa", company: "acme" });

      const response = await POST(makeRequest({ action: "heartbeat" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(mocks.upsertHeartbeat).toHaveBeenCalledWith("acme", 5, "Alice");
    });

    it("handles user with no name gracefully", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 3, name: null, role: "fe", company: "acme" });

      const response = await POST(makeRequest({ action: "heartbeat" }));

      expect(response.status).toBe(200);
      expect(mocks.upsertHeartbeat).toHaveBeenCalledWith("acme", 3, "User 3");
    });

    it("returns success for admin user", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "Admin", role: "admin", company: "acme" });

      const response = await POST(makeRequest({ action: "heartbeat" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });
  });

  describe("disconnect action", () => {
    it("deletes user presence record with company scope", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Bob", role: "be", company: "acme" });

      const response = await POST(makeRequest({ action: "disconnect" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"userId" = CAST(? AS INTEGER)'),
        [7],
      );
    });

    it("enforces company-scoped isolation on disconnect", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 2, name: "Carol", role: "qa", company: "other-co" });
      mocks.getAccessScope.mockReturnValueOnce({ company: "other-co", isAdmin: false, andWhere: ' AND "company" = ?', params: ["other-co"] });

      const response = await POST(makeRequest({ action: "disconnect" }));

      expect(response.status).toBe(200);
      expect(mocks.dbRun).toHaveBeenCalledWith(
        expect.stringContaining('"userId" = CAST(? AS INTEGER)'),
        [2],
      );
    });
  });

  describe("error handling", () => {
    it("returns 500 when upsertHeartbeat throws", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.upsertHeartbeat.mockRejectedValueOnce(new Error("DB error"));

      const response = await POST(makeRequest({ action: "heartbeat" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe("INTERNAL_ERROR");
      expect(json.error).toBe("Failed to update presence");
    });

    it("returns 500 when db.run throws on disconnect", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.dbRun.mockRejectedValueOnce(new Error("DB error"));

      const response = await POST(makeRequest({ action: "disconnect" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("company-scoped isolation", () => {
    it("uses company from getAccessScope for heartbeat", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 10, name: "Dave", role: "fullstack", company: "corp-x" });
      mocks.getAccessScope.mockReturnValueOnce({ company: "corp-x", isAdmin: false, andWhere: ' AND "company" = ?', params: ["corp-x"] });

      const response = await POST(makeRequest({ action: "heartbeat" }));

      expect(response.status).toBe(200);
      expect(mocks.upsertHeartbeat).toHaveBeenCalledWith("corp-x", 10, "Dave");
    });
  });
});
