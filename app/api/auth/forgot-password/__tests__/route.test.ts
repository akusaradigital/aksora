import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  isRateLimited: vi.fn(),
  recordFailedAttempt: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { get: mocks.dbGet, run: mocks.dbRun } }));
vi.mock("@/lib/email", () => ({ sendPasswordResetEmail: mocks.sendPasswordResetEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitKey: (ip: string, suffix: string) => `${ip}|${suffix}`,
  isRateLimited: mocks.isRateLimited,
  recordFailedAttempt: mocks.recordFailedAttempt,
  getClientIp: () => "1.2.3.4",
}));

import { POST } from "../route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isRateLimited.mockResolvedValue({ limited: false });
  mocks.dbRun.mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("returns the same generic success message for an unregistered email (no enumeration)", async () => {
    mocks.dbGet.mockResolvedValueOnce(undefined);
    const res = await POST(makeRequest({ email: "nobody@example.com" }));
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email and returns the same message for a registered email", async () => {
    mocks.dbGet.mockResolvedValueOnce({ id: 1, name: "Jane", email: "jane@example.com" });
    const res = await POST(makeRequest({ email: "jane@example.com" }));
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it("rejects an invalid email format", async () => {
    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rejects when rate limited", async () => {
    mocks.isRateLimited.mockResolvedValueOnce({ limited: true, retryAfterSeconds: 60 });
    const res = await POST(makeRequest({ email: "jane@example.com" }));
    expect(res.status).toBe(429);
    expect(mocks.dbGet).not.toHaveBeenCalled();
  });
});
