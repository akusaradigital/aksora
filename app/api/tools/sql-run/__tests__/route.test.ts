import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  db: {
    query: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isAdminUser: mocks.isAdminUser,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { POST } from "@/app/api/tools/sql-run/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ENABLE_SQL_RUN_ROUTE", "false");
  mocks.getCurrentUser.mockResolvedValue({ id: 1, role: "superadmin", company: "" });
  mocks.isAdminUser.mockReturnValue(true);
  mocks.db.query.mockResolvedValue([{ ok: true }]);
});

describe("sql-run route", () => {
  it("returns 404 when route is disabled", async () => {
    const response = await POST(new Request("http://localhost/api/tools/sql-run", { method: "POST" }) as NextRequest);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Route disabled." });
  });

  it("rejects non-admin users", async () => {
    vi.stubEnv("ENABLE_SQL_RUN_ROUTE", "true");
    mocks.isAdminUser.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/tools/sql-run", {
        method: "POST",
        body: JSON.stringify({ query: "SELECT 1" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden: admin only" });
  });

  it("rejects unsafe queries", async () => {
    vi.stubEnv("ENABLE_SQL_RUN_ROUTE", "true");

    const response = await POST(
      new Request("http://localhost/api/tools/sql-run", {
        method: "POST",
        body: JSON.stringify({ query: "SELECT 1; DROP TABLE User" }),
      }) as NextRequest,
    );

    expect(mocks.db.query).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Only single-statement read-only SELECT queries are allowed",
    });
  });

  it("runs read-only queries when explicitly enabled", async () => {
    vi.stubEnv("ENABLE_SQL_RUN_ROUTE", "true");

    const response = await POST(
      new Request("http://localhost/api/tools/sql-run", {
        method: "POST",
        body: JSON.stringify({ query: "SELECT * FROM \"User\" WHERE \"id\" = ?", params: [1] }),
      }) as NextRequest,
    );

    expect(mocks.db.query).toHaveBeenCalledWith('SELECT * FROM "User" WHERE "id" = ?', [1]);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ ok: true }] });
  });
});
