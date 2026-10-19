import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  hashPassword: vi.fn(),
  sendPasswordResetSuccessEmail: vi.fn(),
  rateLimitKey: vi.fn(),
  isRateLimited: vi.fn(),
  recordFailedAttempt: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { get: mocks.dbGet, run: mocks.dbRun } }));
vi.mock("@/lib/auth-core", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("@/lib/email", () => ({ sendPasswordResetSuccessEmail: mocks.sendPasswordResetSuccessEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitKey: mocks.rateLimitKey,
  isRateLimited: mocks.isRateLimited,
  recordFailedAttempt: mocks.recordFailedAttempt,
  getClientIp: () => "1.2.3.4",
}));

import { POST } from "../route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimitKey.mockImplementation((ip: string, suffix: string) => `${ip}|${suffix}`);
  mocks.isRateLimited.mockResolvedValue({ limited: false });
  mocks.hashPassword.mockResolvedValue("hashed-password");
});

describe("POST /api/auth/reset-password", () => {
  it("keys the rate limit by IP alone (not by any part of the guessed token)", async () => {
    mocks.dbGet.mockResolvedValueOnce(undefined); // no matching token row
    await POST(makeRequest({ token: "guess-one", password: "secret1", confirmPassword: "secret1" }));
    await POST(makeRequest({ token: "a-totally-different-guess", password: "secret1", confirmPassword: "secret1" }));

    expect(mocks.rateLimitKey).toHaveBeenNthCalledWith(1, "1.2.3.4", "reset-password");
    expect(mocks.rateLimitKey).toHaveBeenNthCalledWith(2, "1.2.3.4", "reset-password");
  });

  it("rejects when rate limited", async () => {
    mocks.isRateLimited.mockResolvedValueOnce({ limited: true, retryAfterSeconds: 60 });
    const res = await POST(makeRequest({ token: "tok", password: "secret1", confirmPassword: "secret1" }));
    expect(res.status).toBe(429);
    expect(mocks.dbGet).not.toHaveBeenCalled();
  });

  it("rejects an invalid/unknown token and records a failed attempt", async () => {
    mocks.dbGet.mockResolvedValueOnce(undefined);
    const res = await POST(makeRequest({ token: "bad-token", password: "secret1", confirmPassword: "secret1" }));
    expect(res.status).toBe(400);
    expect(mocks.recordFailedAttempt).toHaveBeenCalled();
  });

  it("resets the password for a valid, unused, unexpired token", async () => {
    mocks.dbGet.mockResolvedValueOnce({
      id: 1,
      userId: 7,
      token: "valid-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
    });
    mocks.dbGet.mockResolvedValueOnce({ name: "Jane", email: "jane@example.com" });

    const res = await POST(makeRequest({ token: "valid-token", password: "secret1", confirmPassword: "secret1" }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mocks.dbRun).toHaveBeenCalledWith(
      'UPDATE "User" SET "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?',
      ["hashed-password", 7],
    );
  });
});
