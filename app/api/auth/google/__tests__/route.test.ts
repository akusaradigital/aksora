import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authEnabled: vi.fn(),
  registerUser: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authEnabled: mocks.authEnabled,
  registerUser: mocks.registerUser,
  createSessionToken: mocks.createSessionToken,
  sessionCookieName: () => "aksora_token",
}));

vi.mock("@/lib/db", () => ({
  db: {
    get: vi.fn(),
    run: vi.fn(),
    query: vi.fn(),
  },
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

import { POST } from "@/app/api/auth/google/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mocks.authEnabled.mockReturnValue(true);
});

describe("auth google route", () => {
  it("returns 500 when auth is disabled", async () => {
    mocks.authEnabled.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/auth/google") as NextRequest);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Auth is not configured." });
  });

  it("returns 500 when GOOGLE_CLIENT_ID is not configured", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");

    const response = await POST(
      new Request("http://localhost/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: "some-credential" }),
      }) as NextRequest,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Google sign-in is not configured." });
  });
});
