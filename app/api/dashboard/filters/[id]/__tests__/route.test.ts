import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAccessScope: vi.fn(),
  updateFilter: vi.fn(),
  deleteFilter: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/data-helpers", () => ({
  getAccessScope: mocks.getAccessScope,
}));

vi.mock("@/lib/data", () => ({
  updateFilter: mocks.updateFilter,
  deleteFilter: mocks.deleteFilter,
}));

import { DELETE, PATCH } from "@/app/api/dashboard/filters/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAccessScope.mockReturnValue({ company: "acme" });
  mocks.updateFilter.mockResolvedValue({
    filter: {
      id: 12,
      company: "acme",
      userId: 7,
      userName: "Rina",
      name: "Updated Filter",
      project: "Project B",
      activityScope: "my",
      density: "compact",
      shared: 1,
      createdAt: "2026-05-18T00:00:00Z",
      updatedAt: "2026-05-18T00:00:00Z",
    },
  });
  mocks.deleteFilter.mockResolvedValue({ success: true });
});

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("DELETE /api/dashboard/filters/[id]", () => {
  it("deletes the current user's filter", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });

    const response = await DELETE(new Request("http://localhost/api/dashboard/filters/12", { method: "DELETE" }), makeParams("12"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ success: true });
    expect(mocks.deleteFilter).toHaveBeenCalledWith("acme", 7, 12);
  });

  it("returns 403 for non-owners", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 8, name: "Budi", role: "qa", company: "acme" });
    mocks.deleteFilter.mockResolvedValueOnce({ error: "Only the filter owner can delete this filter" });

    const response = await DELETE(new Request("http://localhost/api/dashboard/filters/12", { method: "DELETE" }), makeParams("12"));

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.code).toBe("FORBIDDEN");
  });

  it("returns 404 when the filter does not exist", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });
    mocks.deleteFilter.mockResolvedValueOnce({ error: "Filter not found" });

    const response = await DELETE(new Request("http://localhost/api/dashboard/filters/12", { method: "DELETE" }), makeParams("12"));

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("rejects invalid ids", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });

    const response = await DELETE(new Request("http://localhost/api/dashboard/filters/abc", { method: "DELETE" }), makeParams("abc"));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /api/dashboard/filters/[id]", () => {
  it("updates the current user's filter", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });

    const response = await PATCH(
      new Request("http://localhost/api/dashboard/filters/12", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Filter",
          project: "Project B",
          activityScope: "my",
          density: "compact",
          shared: true,
        }),
      }),
      makeParams("12"),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.filter).toMatchObject({
      name: "Updated Filter",
      project: "Project B",
      activityScope: "my",
      density: "compact",
      shared: 1,
    });
    expect(mocks.updateFilter).toHaveBeenCalledWith("acme", 7, 12, "Updated Filter", "Project B", "my", "compact", true);
  });

  it("returns 403 for non-owners", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 8, name: "Budi", role: "qa", company: "acme" });
    mocks.updateFilter.mockResolvedValueOnce({ error: "Only the filter owner can update this filter" });

    const response = await PATCH(
      new Request("http://localhost/api/dashboard/filters/12", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Filter" }),
      }),
      makeParams("12"),
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.code).toBe("FORBIDDEN");
  });

  it("returns 404 when the filter does not exist", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 7, name: "Rina", role: "qa", company: "acme" });
    mocks.updateFilter.mockResolvedValueOnce({ error: "Filter not found" });

    const response = await PATCH(
      new Request("http://localhost/api/dashboard/filters/12", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Filter" }),
      }),
      makeParams("12"),
    );

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.code).toBe("NOT_FOUND");
  });
});
