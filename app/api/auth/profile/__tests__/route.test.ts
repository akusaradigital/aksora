import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createSessionToken: vi.fn(),
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  db: {
    run: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  createSessionToken: mocks.createSessionToken,
  sessionCookieName: () => "aksora_token",
}));

vi.mock("@/lib/auth-core", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { GET, PATCH } from "@/app/api/auth/profile/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth profile route", () => {
  it("returns 401 when no user is present", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects static administrator updates", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 0,
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      company: "",
    });

    const response = await PATCH(
      new Request("http://localhost/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "New Admin", role: "admin" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Administrator profile is controlled via environment variables and cannot be modified.",
    });
  });

  it("validates password length", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: "user@example.com",
      name: "User",
      role: "fullstack",
      company: "acme",
    });

    const response = await PATCH(
      new Request("http://localhost/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "User", role: "fullstack", password: "123" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Password must be at least 6 characters" });
  });

  it("updates profile and refreshes the session cookie", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: "user@example.com",
      name: "User",
      role: "fullstack",
      company: "acme",
      locale: "en",
    });
    mocks.createSessionToken.mockResolvedValueOnce("token-123");

    const response = await PATCH(
      new Request("http://localhost/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: " Updated User ", role: "qa", password: "secret1", locale: "id" }),
      }) as NextRequest,
    );

    expect(mocks.hashPassword).toHaveBeenCalledWith("secret1");
    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "User" SET "name" = ?, "role" = ?, "locale" = ?, "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      ["Updated User", "qa", "id", "hashed:secret1", 1],
    );
    expect(mocks.createSessionToken).toHaveBeenCalledWith("user@example.com", {
      id: 1,
      name: "Updated User",
      role: "qa",
      company: "acme",
      locale: "id",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      user: {
        id: 1,
        name: "Updated User",
        role: "qa",
        company: "acme",
        locale: "id",
      },
    });
    expect(response.headers.get("set-cookie")).toContain("aksora_token=token-123");
    expect(response.headers.get("set-cookie")).toContain("locale=id");
  });
});
