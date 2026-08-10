import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  revokeInvite: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/invites", () => ({
  revokeInvite: mocks.revokeInvite,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import { DELETE } from "@/app/api/invites/[token]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ role: "superadmin", company: "", name: "Admin" });
});

describe("invite token route", () => {
  it("returns 403 when revoke fails", async () => {
    mocks.revokeInvite.mockResolvedValueOnce({ error: "Denied" });

    const response = await DELETE(
      new Request("http://localhost/api/invites/t1") as NextRequest,
      { params: Promise.resolve({ token: "t1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Denied" });
  });

  it("revokes invites", async () => {
    mocks.revokeInvite.mockResolvedValueOnce({ ok: true });

    const response = await DELETE(
      new Request("http://localhost/api/invites/t1") as NextRequest,
      { params: Promise.resolve({ token: "t1" }) },
    );

    expect(mocks.revokeInvite).toHaveBeenCalledWith("t1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
