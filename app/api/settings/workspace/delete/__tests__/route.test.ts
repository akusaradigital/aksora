import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isWorkspaceAdmin: vi.fn(),
  isPlatformSuperAdmin: vi.fn(),
  db: {
    run: vi.fn(),
    transaction: vi.fn((cb: () => Promise<unknown>) => cb()),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/roles")>();
  return {
    ...actual,
    isWorkspaceAdmin: mocks.isWorkspaceAdmin,
    isPlatformSuperAdmin: mocks.isPlatformSuperAdmin,
  };
});

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.transaction.mockImplementation((cb: () => Promise<unknown>) => cb());
  mocks.getCurrentUser.mockResolvedValue({
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    company: "Acme Corp",
  });
  mocks.isWorkspaceAdmin.mockReturnValue(true);
  mocks.isPlatformSuperAdmin.mockReturnValue(false);
});

describe("DELETE workspace data endpoint", () => {
  it("returns 401 if user is not authenticated", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost/api/settings/workspace/delete", {
      method: "POST",
      body: JSON.stringify({ confirmCompanyName: "Acme Corp" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not workspace admin or platform superadmin", async () => {
    mocks.isWorkspaceAdmin.mockReturnValueOnce(false);
    mocks.isPlatformSuperAdmin.mockReturnValueOnce(false);

    const req = new NextRequest("http://localhost/api/settings/workspace/delete", {
      method: "POST",
      body: JSON.stringify({ confirmCompanyName: "Acme Corp" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 if confirmCompanyName does not match exact user company name", async () => {
    const req = new NextRequest("http://localhost/api/settings/workspace/delete", {
      method: "POST",
      body: JSON.stringify({ confirmCompanyName: "acme corp" }), // wrong case
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Company name confirmation does not match.");
    expect(mocks.db.run).not.toHaveBeenCalled();
  });

  it("deletes company data and updates company status to deleted when confirmed", async () => {
    const req = new NextRequest("http://localhost/api/settings/workspace/delete", {
      method: "POST",
      body: JSON.stringify({ confirmCompanyName: "Acme Corp" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      message: "Company data has been permanently deleted.",
    });

    expect(mocks.db.transaction).toHaveBeenCalled();
    expect(mocks.db.run).toHaveBeenCalledWith(
      `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
      [
        "Admin User",
        "company_data_deleted",
        "Acme Corp",
        "All workspace data deleted, status set to deleted",
      ]
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      `DELETE FROM "ApiKey" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "company" = ?)`,
      ["Acme Corp"]
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      `DELETE FROM "User" WHERE "company" = ? AND "id" != CAST(? AS INTEGER)`,
      ["Acme Corp", 1]
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      `DELETE FROM "SearchToken" WHERE "company" = ?`,
      ["Acme Corp"]
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      `DELETE FROM "Invite" WHERE "company" = ?`,
      ["Acme Corp"]
    );

    expect(mocks.db.run).toHaveBeenCalledWith(
      `UPDATE "Company" SET "status" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`,
      ["deleted", "Acme Corp"]
    );

    // ApiKey rows must be deleted before the User rows that own them.
    const apiKeyCallIndex = mocks.db.run.mock.calls.findIndex(
      ([sql]) => sql === `DELETE FROM "ApiKey" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "company" = ?)`
    );
    const userCallIndex = mocks.db.run.mock.calls.findIndex(
      ([sql]) => sql === `DELETE FROM "User" WHERE "company" = ? AND "id" != CAST(? AS INTEGER)`
    );
    expect(apiKeyCallIndex).toBeGreaterThanOrEqual(0);
    expect(apiKeyCallIndex).toBeLessThan(userCallIndex);
  });
});
