import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authEnabled: vi.fn(),
  createSessionToken: vi.fn(),
  verifyTempMfaToken: vi.fn(),
  dbGet: vi.fn(),
  verifyTotpCode: vi.fn(),
  isRateLimited: vi.fn(),
  recordFailedAttempt: vi.fn(),
  clearRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEnabled: mocks.authEnabled,
  createSessionToken: mocks.createSessionToken,
  verifyTempMfaToken: mocks.verifyTempMfaToken,
  sessionCookieName: () => "aksora_token",
}));

vi.mock("@/lib/db", () => ({ db: { get: mocks.dbGet } }));
vi.mock("@/lib/totp", () => ({ verifyTotpCode: mocks.verifyTotpCode }));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mocks.isRateLimited,
  recordFailedAttempt: mocks.recordFailedAttempt,
  clearRateLimit: mocks.clearRateLimit,
}));

import { POST } from "../route";

const USER = { id: 1, name: "Jane", email: "jane@example.com", role: "admin", company: "acme", mfaSecret: "SECRET", mfaEnabled: 1 };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/verify-mfa", {
    method: "POST",
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authEnabled.mockReturnValue(true);
  mocks.isRateLimited.mockResolvedValue({ limited: false });
  mocks.verifyTempMfaToken.mockResolvedValue(USER.id);
  mocks.dbGet.mockResolvedValue(USER);
  mocks.createSessionToken.mockResolvedValue("session-token");
});

describe("POST /api/auth/verify-mfa", () => {
  it("rejects when the caller is rate limited, without checking the code", async () => {
    mocks.isRateLimited.mockResolvedValueOnce({ limited: true, retryAfterSeconds: 120 });
    const res = await POST(makeRequest({ tempToken: "tok", code: "000000" }));
    expect(res.status).toBe(429);
    expect(mocks.verifyTotpCode).not.toHaveBeenCalled();
  });

  it("records a failed attempt (rate-limit penalty) on an invalid code", async () => {
    mocks.verifyTotpCode.mockReturnValue(false);
    const res = await POST(makeRequest({ tempToken: "tok", code: "000000" }));
    expect(res.status).toBe(400);
    expect(mocks.recordFailedAttempt).toHaveBeenCalledWith(
      "mfa-verify|tok",
      expect.objectContaining({ maxAttempts: 5 }),
    );
  });

  it("clears the rate limit and issues a session on a valid code", async () => {
    mocks.verifyTotpCode.mockReturnValue(true);
    const res = await POST(makeRequest({ tempToken: "tok", code: "123456" }));
    expect(res.status).toBe(200);
    expect(mocks.clearRateLimit).toHaveBeenCalledWith("mfa-verify|tok");
    expect(mocks.recordFailedAttempt).not.toHaveBeenCalled();
  });
});
