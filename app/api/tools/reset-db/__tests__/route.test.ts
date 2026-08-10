import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  db: {
    exec: vi.fn(),
  },
  tables: [{ name: "User" }, { name: "Task" }],
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/auth-core", () => ({
  isAdminUser: mocks.isAdminUser,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
  tables: mocks.tables,
}));

import { POST } from "@/app/api/tools/reset-db/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ENABLE_RESET_DB_ROUTE", "false");
  vi.stubEnv("RESET_SECRET", "topsecret");
  mocks.getCurrentUser.mockResolvedValue({ id: 1, role: "superadmin", company: "" });
  mocks.isAdminUser.mockReturnValue(true);
  mocks.db.exec.mockResolvedValue(undefined);
});

describe("reset-db route", () => {
  it("returns 404 when route is disabled", async () => {
    const response = await POST(new Request("http://localhost/api/tools/reset-db", { method: "POST" }) as NextRequest);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Route disabled." });
  });

  it("returns 403 for non-admin user", async () => {
    vi.stubEnv("ENABLE_RESET_DB_ROUTE", "true");
    mocks.isAdminUser.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/tools/reset-db", {
        method: "POST",
        body: JSON.stringify({ secret: "topsecret" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("truncates tables when explicitly enabled and authorized", async () => {
    vi.stubEnv("ENABLE_RESET_DB_ROUTE", "true");

    const response = await POST(
      new Request("http://localhost/api/tools/reset-db", {
        method: "POST",
        body: JSON.stringify({ secret: "topsecret" }),
      }) as NextRequest,
    );

    expect(mocks.db.exec).toHaveBeenCalledWith('TRUNCATE "User", "Task" RESTART IDENTITY CASCADE;');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
