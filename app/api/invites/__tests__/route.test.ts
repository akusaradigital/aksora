import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  isManagementAdmin: vi.fn(),
  listInvites: vi.fn(),
  createInvite: vi.fn(),
  isInviteRole: vi.fn(),
  normalizeRole: vi.fn((role: string) => role),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/roles", () => ({
  isAdminUser: mocks.isAdminUser,
  isManagementAdmin: mocks.isManagementAdmin,
  isInviteRole: mocks.isInviteRole,
  normalizeRole: mocks.normalizeRole,
}));

vi.mock("@/lib/invites", () => ({
  listInvites: mocks.listInvites,
  createInvite: mocks.createInvite,
}));

import { GET, POST } from "@/app/api/invites/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isManagementAdmin.mockImplementation((role: string) => String(role).trim().toLowerCase() === "admin");
});

describe("invites route", () => {
  it("rejects non-admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "qa", company: "acme" });
    mocks.isAdminUser.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/invites") as NextRequest);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("lists invites for admins", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "" });
    mocks.isAdminUser.mockReturnValue(true);
    mocks.listInvites.mockResolvedValueOnce([{ token: "t1", status: "pending" }]);

    const response = await GET(new Request("http://localhost/api/invites") as NextRequest);

    expect(mocks.listInvites).toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ invites: [{ token: "t1", status: "pending" }] });
  });

  it("creates invite links for admins", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "" });
    mocks.isAdminUser.mockReturnValue(true);
    mocks.isInviteRole.mockReturnValue(true);
    mocks.normalizeRole.mockReturnValueOnce("qa");
    mocks.createInvite.mockResolvedValueOnce({ token: "tok-123", company: "acme", role: "qa", expiresAt: "2026-05-05T00:00:00.000Z" });

    const response = await POST({
      nextUrl: new URL("http://localhost/api/invites"),
      json: async () => ({ role: "qa", expiresInDays: 7 }),
    } as NextRequest);

    expect(mocks.createInvite).toHaveBeenCalledWith({ role: "qa", expiresInDays: 7 });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      invite: { token: "tok-123", company: "acme", role: "qa", expiresAt: "2026-05-05T00:00:00.000Z" },
      link: "http://localhost/register?inviteToken=tok-123",
    });
  });
});
