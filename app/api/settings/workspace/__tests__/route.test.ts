import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  db: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 1, name: "Admin", email: "admin@example.com", role: "qa", company: "acme" });
  mocks.db.get.mockResolvedValue(undefined);
});

describe("workspace settings route", () => {
  it("returns null for platform superadmin users without a company", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 2, name: "Super", email: "super@example.com", role: "superadmin", company: "" });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ data: null });
    expect(mocks.db.get).not.toHaveBeenCalled();
  });

  it("returns workspace plan data and current user count", async () => {
    mocks.db.get
      .mockResolvedValueOnce({
        name: "acme",
        plan: "pro",
        planExpiry: "2026-12-31T00:00:00.000Z",
        maxUsers: 25,
        status: "active",
        createdAt: "2026-01-02T00:00:00.000Z",
      })
      .mockResolvedValueOnce({ count: 7 });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({
      companyName: "acme",
      plan: "pro",
      planExpiry: "2026-12-31T00:00:00.000Z",
      maxUsers: 25,
      currentUsers: 7,
      status: "active",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    expect(mocks.db.get).toHaveBeenNthCalledWith(
      1,
      'SELECT "name", "plan", "planExpiry", "maxUsers", "status", "createdAt" FROM "Company" WHERE "name" = ?',
      ["acme"],
    );
    expect(mocks.db.get).toHaveBeenNthCalledWith(
      2,
      'SELECT COUNT(*) as "count" FROM "User" WHERE "company" = ? AND "deletedAt" IS NULL',
      ["acme"],
    );
  });

  it("falls back to free plan defaults for legacy workspaces without a company row", async () => {
    mocks.db.get
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ count: 3 });

    const response = await GET();
    const payload = await response.json();

    expect(payload.data).toMatchObject({
      companyName: "acme",
      plan: "free",
      maxUsers: 5,
      currentUsers: 3,
      status: "active",
      createdAt: null,
      planExpiry: null,
    });
  });
});
