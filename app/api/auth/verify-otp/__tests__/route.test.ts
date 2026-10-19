import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  isRateLimited: vi.fn(),
  recordFailedAttempt: vi.fn(),
  clearRateLimit: vi.fn(),
  checkMemoryRateLimit: vi.fn(),
  sendOtpEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  emailEnabled: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { get: mocks.dbGet, run: mocks.dbRun } }));
vi.mock("@/lib/email", () => ({
  sendOtpEmail: mocks.sendOtpEmail,
  sendWelcomeEmail: mocks.sendWelcomeEmail,
  emailEnabled: mocks.emailEnabled,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitKey: (ip: string, email: string) => `${ip}|${email}`,
  isRateLimited: mocks.isRateLimited,
  recordFailedAttempt: mocks.recordFailedAttempt,
  clearRateLimit: mocks.clearRateLimit,
  checkMemoryRateLimit: mocks.checkMemoryRateLimit,
  getClientIp: () => "1.2.3.4",
}));

import { POST } from "../route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isRateLimited.mockResolvedValue({ limited: false });
  mocks.checkMemoryRateLimit.mockReturnValue({ limited: false });
  mocks.emailEnabled.mockReturnValue(true);
});

describe("POST /api/auth/verify-otp — enumeration resistance", () => {
  it("responds identically (code path) for an unregistered email and a genuinely wrong code", async () => {
    mocks.dbGet.mockResolvedValueOnce(undefined); // unregistered
    const unregistered = await POST(makeRequest({ email: "nobody@example.com", code: "123456" }));
    const unregisteredBody = await unregistered.json();

    mocks.dbGet.mockResolvedValueOnce({
      id: 1,
      company: "acme",
      emailVerified: 0,
      otpCode: null, // expired/absent -> same "Invalid or expired code" branch
      otpExpiresAt: null,
      otpAttempts: 0,
    });
    const expired = await POST(makeRequest({ email: "real@example.com", code: "123456" }));
    const expiredBody = await expired.json();

    expect(unregistered.status).toBe(expired.status);
    expect(unregisteredBody).toEqual(expiredBody);
  });

  it("responds identically (resend path) for an unregistered email and an already-verified email", async () => {
    mocks.dbGet.mockResolvedValueOnce(undefined); // unregistered
    const unregistered = await POST(makeRequest({ email: "nobody@example.com", resend: true }));
    const unregisteredBody = await unregistered.json();

    mocks.dbGet.mockResolvedValueOnce({ id: 1, company: "acme", emailVerified: 1, otpCode: null, otpExpiresAt: null, otpAttempts: 0 });
    const verified = await POST(makeRequest({ email: "already-verified@example.com", resend: true }));
    const verifiedBody = await verified.json();

    expect(unregistered.status).toBe(verified.status);
    expect(unregisteredBody).toEqual(verifiedBody);
    expect(mocks.sendOtpEmail).not.toHaveBeenCalled();
    expect(mocks.dbRun).not.toHaveBeenCalled();
  });

  it("still sends a real OTP on resend for a genuine unverified pending account", async () => {
    mocks.dbGet.mockResolvedValueOnce({ id: 1, company: "acme", emailVerified: 0, otpCode: null, otpExpiresAt: null, otpAttempts: 0 });
    const res = await POST(makeRequest({ email: "pending@example.com", resend: true }));
    const body = await res.json();
    expect(body).toEqual({ ok: true, sent: true });
    expect(mocks.sendOtpEmail).toHaveBeenCalled();
    expect(mocks.dbRun).toHaveBeenCalled();
  });

  it("still verifies a correct code for a genuine pending account", async () => {
    mocks.dbGet.mockResolvedValueOnce({
      id: 1,
      company: "acme",
      emailVerified: 0,
      otpCode: "654321",
      otpExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      otpAttempts: 0,
    });
    const res = await POST(makeRequest({ email: "pending@example.com", code: "654321" }));
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mocks.clearRateLimit).toHaveBeenCalled();
  });
});
