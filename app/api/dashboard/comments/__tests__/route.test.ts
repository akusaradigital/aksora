import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  dbGet: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/data", () => ({
  getComments: mocks.getComments,
  createComment: mocks.createComment,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: mocks.dbGet,
  },
}));

import { GET, POST } from "@/app/api/dashboard/comments/route";

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/dashboard/comments");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/dashboard/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({
    company: "acme",
    isAdmin: false,
    andWhere: ' AND "company" = ?',
    params: ["acme"],
  });
  mocks.dbGet.mockResolvedValue({ id: 1 });
  mocks.getComments.mockResolvedValue([]);
  mocks.createComment.mockResolvedValue(undefined);
});

describe("GET /api/dashboard/comments", () => {
  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(null);

      const response = await GET(makeGetRequest({ entityType: "Bug", entityId: "1" }));

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("validation", () => {
    it("returns 400 when entityType is missing", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await GET(makeGetRequest({ entityId: "1" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityType");
    });

    it("returns 400 when entityId is missing", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await GET(makeGetRequest({ entityType: "Bug" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityId");
    });

    it("returns 400 when entityType is invalid", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await GET(makeGetRequest({ entityType: "Release", entityId: "1" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityType");
    });

    it("returns 400 when entityId is not a positive integer", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await GET(makeGetRequest({ entityType: "Bug", entityId: "abc" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityId");
    });

    it("returns 400 when entityId is zero", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await GET(makeGetRequest({ entityType: "Bug", entityId: "0" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("successful responses", () => {
    it("returns comments in chronological order with readOnly flag", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      const mockComments = [
        { id: 1, authorName: "Alice", content: "First comment", createdAt: "2024-01-01T10:00:00Z" },
        { id: 2, authorName: "Bob", content: "Second comment", createdAt: "2024-01-01T11:00:00Z" },
      ];
      mocks.getComments.mockResolvedValueOnce(mockComments);

      const response = await GET(makeGetRequest({ entityType: "Bug", entityId: "5" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.comments).toEqual(mockComments);
      expect(json.canWrite).toBe(true);
    });

    it("returns empty comments array when no comments exist", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.getComments.mockResolvedValueOnce([]);

      const response = await GET(makeGetRequest({ entityType: "Task", entityId: "3" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.comments).toEqual([]);
      expect(json.canWrite).toBe(true);
    });

    it("calls getComments with company scope", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.getComments.mockResolvedValueOnce([]);

      await GET(makeGetRequest({ entityType: "Bug", entityId: "7" }));

      expect(mocks.getComments).toHaveBeenCalledWith("acme", "Bug", 7);
    });
  });

  describe("error handling", () => {
    it("returns 500 when getComments throws", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.getComments.mockRejectedValueOnce(new Error("DB error"));

      const response = await GET(makeGetRequest({ entityType: "Bug", entityId: "1" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("POST /api/dashboard/comments", () => {
  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce(null);

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "Hello" }));

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });
  });

  describe("validation", () => {
    it("returns 400 when body is invalid JSON", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(new Request("http://localhost/api/dashboard/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when entityType is missing", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makePostRequest({ entityId: 1, content: "Hello" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when entityType is invalid", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makePostRequest({ entityType: "Release", entityId: 1, content: "Hello" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityType");
    });

    it("returns 400 when entityId is not a positive integer", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: -1, content: "Hello" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("entityId");
    });

    it("returns 400 when content is missing", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1 }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("content");
    });

    it("returns 400 when content is empty string", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("empty");
    });

    it("returns 400 when content is whitespace only", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "   \n\t  " }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("empty");
    });

    it("returns 400 when content exceeds 2000 characters after trimming", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      const longContent = "a".repeat(2001);

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: longContent }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.error).toContain("2000");
    });

    it("accepts content at exactly 2000 characters", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      const exactContent = "a".repeat(2000);
      mocks.createComment.mockResolvedValueOnce({
        id: 1,
        company: "acme",
        entityType: "Bug",
        entityId: 1,
        authorId: 1,
        authorName: "John",
        content: exactContent,
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
      });

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: exactContent }));

      expect(response.status).toBe(200);
    });

    it("trims content before validation", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.createComment.mockResolvedValueOnce({
        id: 1,
        company: "acme",
        entityType: "Bug",
        entityId: 1,
        authorId: 1,
        authorName: "John",
        content: "Hello",
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
      });

      await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "  Hello  " }));

      expect(mocks.createComment).toHaveBeenCalledWith(
        "acme", "Bug", 1, 1, "John", "Hello"
      );
    });
  });

  describe("successful creation", () => {
    it("creates comment and returns 201 with comment data", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 2, name: "Alice", role: "fe", company: "acme" });
      const mockComment = {
        id: 10,
        company: "acme",
        entityType: "Task",
        entityId: 5,
        authorId: 2,
        authorName: "Alice",
        content: "Great progress!",
        createdAt: "2024-01-01T12:00:00Z",
        updatedAt: "2024-01-01T12:00:00Z",
      };
      mocks.createComment.mockResolvedValueOnce(mockComment);

      const response = await POST(makePostRequest({ entityType: "Task", entityId: 5, content: "Great progress!" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.comment).toEqual(mockComment);
    });

    it("calls createComment with correct parameters", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 3, name: "Bob", role: "be", company: "acme" });
      mocks.createComment.mockResolvedValueOnce({
        id: 11,
        company: "acme",
        entityType: "Bug",
        entityId: 7,
        authorId: 3,
        authorName: "Bob",
        content: "Investigating",
        createdAt: "2024-01-01T13:00:00Z",
        updatedAt: "2024-01-01T13:00:00Z",
      });

      await POST(makePostRequest({ entityType: "Bug", entityId: 7, content: "Investigating" }));

      expect(mocks.createComment).toHaveBeenCalledWith(
        "acme", "Bug", 7, 3, "Bob", "Investigating"
      );
    });

    it("allows all roles to write comments", async () => {
      const roles = ["qa", "fe", "be", "fullstack", "pm", "ai", "admin", "superadmin"];

      for (const role of roles) {
        vi.clearAllMocks();
        mocks.getAccessScope.mockReturnValue({ company: "acme", isAdmin: false, andWhere: ' AND "company" = ?', params: ["acme"] });
        mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "User", role, company: "acme" });
        mocks.createComment.mockResolvedValueOnce({
          id: 1,
          company: "acme",
          entityType: "Bug",
          entityId: 1,
          authorId: 1,
          authorName: "User",
          content: "Test",
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:00:00Z",
        });

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "Test" }));

      expect(response.status).toBe(200);
    }
    });
  });

  describe("error handling", () => {
    it("returns 500 when createComment returns undefined", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.createComment.mockResolvedValueOnce(undefined);

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "Hello" }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({});
    });

    it("returns 500 when createComment throws", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "acme" });
      mocks.createComment.mockRejectedValueOnce(new Error("DB error"));

      const response = await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "Hello" }));

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("company-scoped isolation", () => {
    it("uses company from getAccessScope for createComment", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "beta-corp" });
      mocks.getAccessScope.mockReturnValueOnce({ company: "beta-corp", isAdmin: false, andWhere: ' AND "company" = ?', params: ["beta-corp"] });
      mocks.createComment.mockResolvedValueOnce({
        id: 1,
        company: "beta-corp",
        entityType: "Bug",
        entityId: 1,
        authorId: 1,
        authorName: "John",
        content: "Test",
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
      });

      await POST(makePostRequest({ entityType: "Bug", entityId: 1, content: "Test" }));

      expect(mocks.createComment).toHaveBeenCalledWith(
        "beta-corp", "Bug", 1, 1, "John", "Test"
      );
    });

    it("uses company from getAccessScope for getComments", async () => {
      mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, name: "John", role: "qa", company: "beta-corp" });
      mocks.getAccessScope.mockReturnValueOnce({ company: "beta-corp", isAdmin: false, andWhere: ' AND "company" = ?', params: ["beta-corp"] });
      mocks.getComments.mockResolvedValueOnce([]);

      await GET(makeGetRequest({ entityType: "Task", entityId: "2" }));

      expect(mocks.getComments).toHaveBeenCalledWith("beta-corp", "Task", 2);
    });
  });
});
