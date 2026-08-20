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
    run: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock("@/lib/workspace-memberships", () => ({
  ensureWorkspaceForUser: vi.fn(),
  ensureWorkspaceMembership: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitKey: (_ip: string, email: string) => `test|${email}`,
  isRateLimited: () => ({ limited: false }),
  recordFailedAttempt: () => {},
  clearRateLimit: () => {},
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn(),
  sendInviteAcceptedEmail: vi.fn(),
  sendOtpEmail: vi.fn(),
  emailEnabled: () => false,
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
    mockedDb.get.mockResolvedValueOnce({ id: 1, role: "admin", company: "User's Workspace" });
    mocks.registerUser.mockResolvedValueOnce({ ok: true });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "secret", name: "User" }),
      }) as NextRequest,
    );

    expect(mocks.registerUser).toHaveBeenCalledWith("user@example.com", "secret", "User", "admin", "User's Workspace");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("registers invited user with invite role and workspace", async () => {
    const { getInviteByToken, markInviteAccepted } = await import("@/lib/invites");
    const { isInviteRole } = await import("@/lib/roles");
    const { ensureWorkspaceMembership } = await import("@/lib/workspace-memberships");
    const { db } = await import("@/lib/db");

    (getInviteByToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      token: "valid-token",
      role: "qa",
      company: "Acme Corp",
      workspaceId: 42,
      status: "pending",
      createdBy: "owner@acme.com",
    });
    (isInviteRole as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    mocks.registerUser.mockResolvedValueOnce({ ok: true });
    (markInviteAccepted as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

    const mockedDb = db as unknown as { get: ReturnType<typeof vi.fn> };
    mockedDb.get.mockResolvedValueOnce({ id: 99, role: "qa", company: "Acme Corp" });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "invited@example.com",
          password: "password123",
          name: "Invited QA",
          inviteToken: "valid-token",
        }),
      }) as NextRequest,
    );

    expect(mocks.registerUser).toHaveBeenCalledWith("invited@example.com", "password123", "Invited QA", "qa", "Acme Corp");
    expect(ensureWorkspaceMembership).toHaveBeenCalledWith(42, 99, "qa");
    expect(markInviteAccepted).toHaveBeenCalledWith("valid-token", "invited@example.com");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
