import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// GOOGLE_CLIENT_ID is read into a module-level const at import time, so it
// must be set before the route module is evaluated — set it directly on
// process.env ahead of the dynamic import below, rather than vi.stubEnv
// (which runs too late relative to ESM import hoisting).
process.env.GOOGLE_CLIENT_ID = "test-client-id";

const mocks = vi.hoisted(() => ({
  authEnabled: vi.fn(),
  registerUser: vi.fn(),
  createSessionToken: vi.fn(),
  createTempMfaToken: vi.fn(),
  dbGet: vi.fn(),
  dbRun: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEnabled: mocks.authEnabled,
  registerUser: mocks.registerUser,
  createSessionToken: mocks.createSessionToken,
  createTempMfaToken: mocks.createTempMfaToken,
  sessionCookieName: () => "aksora_token",
}));

vi.mock("@/lib/db", () => ({
  db: { get: mocks.dbGet, run: mocks.dbRun, query: vi.fn() },
}));

vi.mock("@/lib/workspace-memberships", () => ({
  ensureWorkspaceForUser: vi.fn(),
  ensureWorkspaceMembership: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitKey: (_ip: string, token: string) => `test|${token}`,
  isRateLimited: () => ({ limited: false }),
  recordFailedAttempt: () => {},
  clearRateLimit: () => {},
  getClientIp: () => "1.2.3.4",
}));

vi.mock("@/lib/invites", () => ({
  getInviteByToken: vi.fn(),
  markInviteAccepted: vi.fn(),
}));

vi.mock("@/lib/roles", () => ({
  isInviteRole: vi.fn(),
  normalizeRole: vi.fn((role: string) => role),
}));

vi.mock("@/lib/plan-limits", () => ({
  checkCompanyUserLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

const { POST } = await import("@/app/api/auth/google/route");

const EXISTING_USER = {
  id: 1,
  name: "Jane",
  email: "jane@example.com",
  role: "admin",
  company: "acme",
  avatar: "",
  mfaEnabled: 1,
  activeWorkspaceId: 10,
};

function mockGoogleTokeninfo(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        email: "jane@example.com",
        email_verified: "true",
        name: "Jane",
        aud: "test-client-id",
        exp: String(Math.floor(Date.now() / 1000) + 3600),
        ...overrides,
      }),
    }),
  );
}

function makeRequest() {
  return new Request("http://localhost/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential: "fake-google-credential" }),
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authEnabled.mockReturnValue(true);
  mocks.dbRun.mockResolvedValue(undefined);
  mocks.createTempMfaToken.mockResolvedValue("temp-mfa-token");
  mockGoogleTokeninfo();
});

describe("auth google route — MFA gate", () => {
  it("requires MFA verification for an existing user with mfaEnabled, instead of issuing a session", async () => {
    mocks.dbGet.mockResolvedValue({ ...EXISTING_USER, mfaEnabled: 1 });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body).toEqual({ requiresMfa: true, tempToken: "temp-mfa-token" });
    expect(mocks.createTempMfaToken).toHaveBeenCalledWith(EXISTING_USER.id);
    expect(mocks.createSessionToken).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeFalsy();
  });

  it("issues a full session for an existing user without MFA enabled", async () => {
    mocks.dbGet.mockResolvedValue({ ...EXISTING_USER, mfaEnabled: 0 });
    mocks.createSessionToken.mockResolvedValue("session-token");

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body).toEqual({ ok: true, role: "admin", company: "acme" });
    expect(mocks.createSessionToken).toHaveBeenCalled();
  });
});
