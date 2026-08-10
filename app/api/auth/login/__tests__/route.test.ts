import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authEnabled: vi.fn(),
  validateCredentials: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEnabled: mocks.authEnabled,
  validateCredentials: mocks.validateCredentials,
  createSessionToken: mocks.createSessionToken,
  sessionCookieName: () => "aksora_session",
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitKey: (_ip: string, email: string) => `test|${email}`,
  isRateLimited: () => ({ limited: false }),
  recordFailedAttempt: () => {},
  clearRateLimit: () => {},
}));

import { POST } from "@/app/api/auth/login/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authEnabled.mockReturnValue(true);
});

describe("auth login route", () => {
  it("returns 500 when auth is disabled", async () => {
    mocks.authEnabled.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/auth/login") as NextRequest);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "AUTH_SECRET is not configured. Restart the dev server after setting .env.",
    });
  });

  it("returns 401 for invalid credentials", async () => {
    mocks.validateCredentials.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "badpassword" }),
      }) as NextRequest,
    );

    expect(mocks.validateCredentials).toHaveBeenCalledWith("user@example.com", "badpassword");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid email or password." });
  });

  it("sets the session cookie for valid credentials", async () => {
    mocks.validateCredentials.mockResolvedValueOnce({ id: 1, email: "user@example.com" });
    mocks.createSessionToken.mockResolvedValueOnce("token-123");

    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: " user@example.com ", password: "secret" }),
      }) as NextRequest,
    );

    expect(mocks.createSessionToken).toHaveBeenCalledWith("user@example.com", {
      id: 1,
      email: "user@example.com",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("aksora_session=token-123");
  });
});
