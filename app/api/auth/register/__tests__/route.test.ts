import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authEnabled: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEnabled: mocks.authEnabled,
  registerUser: mocks.registerUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: vi.fn(),
  },
}));

vi.mock("@/lib/invites", () => ({
  getInviteByToken: vi.fn(),
  markInviteAccepted: vi.fn(),
}));

vi.mock("@/lib/roles", () => ({
  isInviteRole: vi.fn(),
  normalizeRole: vi.fn((role: string) => role),
}));

import { POST } from "@/app/api/auth/register/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authEnabled.mockReturnValue(true);
});

describe("auth register route", () => {
  it("returns 500 when auth is disabled", async () => {
    mocks.authEnabled.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/auth/register") as NextRequest);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Auth is not configured." });
  });

  it("requires email and password", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Email and password are required." });
  });

  it("registers the first user as admin", async () => {
    const { db } = await import("@/lib/db");
    const mockedDb = db as unknown as { get: ReturnType<typeof vi.fn> };
    mockedDb.get.mockResolvedValueOnce({ count: 0 });
    mocks.registerUser.mockResolvedValueOnce({ ok: true });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret", name: "User" }),
      }) as NextRequest,
    );

    expect(mocks.registerUser).toHaveBeenCalledWith("user@example.com", "secret", "User", "admin", "");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
