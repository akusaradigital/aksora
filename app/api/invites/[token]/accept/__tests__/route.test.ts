import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  markInviteAccepted: vi.fn(),
}));

vi.mock("@/lib/invites", () => ({
  markInviteAccepted: mocks.markInviteAccepted,
}));

import { POST } from "@/app/api/invites/[token]/accept/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invite accept route", () => {
  it("returns 400 when acceptance fails", async () => {
    mocks.markInviteAccepted.mockResolvedValueOnce({ error: "Invite not found." });

    const response = await POST(
      {
        json: async () => ({ email: "user@example.com" }),
      } as NextRequest,
      { params: Promise.resolve({ token: "tok" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invite not found." });
  });

  it("accepts an invite", async () => {
    mocks.markInviteAccepted.mockResolvedValueOnce({ ok: true });

    const response = await POST(
      {
        json: async () => ({ email: " user@example.com " }),
      } as NextRequest,
      { params: Promise.resolve({ token: "tok" }) },
    );

    expect(mocks.markInviteAccepted).toHaveBeenCalledWith("tok", "user@example.com");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
