import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  getFilters: vi.fn(),
  createFilter: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/data", () => ({
  getFilters: mocks.getFilters,
  createFilter: mocks.createFilter,
}));

import { GET, POST } from "@/app/api/dashboard/filters/route";

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/dashboard/filters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({ company: "acme" });
  mocks.getFilters.mockResolvedValue({ own: [], shared: [] });
  mocks.createFilter.mockResolvedValue({
    filter: {
      id: 1,
      company: "acme",
      userId: 7,
      userName: "Rina",
      name: "My Filter",
      project: "Project A",
      activityScope: "team",
      density: "comfortable",
      shared: 0,
      createdAt: "2026-05-18T00:00:00Z",
      updatedAt: "2026-05-18T00:00:00Z",
    },
  });
});

describe("GET /api/dashboard/filters", () => {
  it("returns filters scoped to the current company", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });

    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ filters: { own: [], shared: [] } });
    expect(mocks.getFilters).toHaveBeenCalledWith("acme", 7);
  });

  it("returns 401 when the user is missing", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/dashboard/filters", () => {
  it("creates a saved filter with sanitized defaults", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 7,
      name: "Rina",
      email: "rina@example.com",
      role: "qa",
      company: "acme",
    });

    const response = await POST(makePostRequest({
      name: "  Regression  ",
      project: " Project A ",
      activityScope: "invalid-scope",
      density: "invalid-density",
      shared: true,
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.filter).toMatchObject({
      name: "My Filter",
      project: "Project A",
      activityScope: "team",
      density: "comfortable",
      shared: 0,
    });
    expect(mocks.createFilter).toHaveBeenCalledWith(
      "acme",
      7,
      "Rina",
      "Regression",
      "Project A",
      "team",
      "comfortable",
      true,
    );
  });

  it("returns validation errors from the data layer", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });
    mocks.createFilter.mockResolvedValueOnce({ error: "A filter with this name already exists" });

    const response = await POST(makePostRequest({ name: "Duplicate", project: "Project A" }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(json.error).toBe("A filter with this name already exists");
  });

  it("rejects invalid names", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });

    const response = await POST(makePostRequest({ name: "   " }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });
});
