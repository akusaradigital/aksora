import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isAdminUser: vi.fn(),
  isWorkspaceAdmin: vi.fn(),
  normalizeRole: vi.fn((role: string) => String(role).trim().toLowerCase()),
  isInviteRole: vi.fn((role: string) => ["qa", "pm", "fe", "be", "fullstack", "ai"].includes(role)),
  isAssignableRole: vi.fn((role: string) => ["qa", "pm", "fe", "be", "fullstack", "ai"].includes(role)),
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  db: {
    get: vi.fn(),
    run: vi.fn(),
  },
  syncAssigneeFromUser: vi.fn(async () => undefined),
  deleteAssigneeForUser: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/roles", () => ({
  isAdminUser: mocks.isAdminUser,
  isWorkspaceAdmin: mocks.isWorkspaceAdmin,
  isInviteRole: mocks.isInviteRole,
  normalizeRole: mocks.normalizeRole,
  isAssignableRole: mocks.isAssignableRole,
}));

vi.mock("@/lib/auth-core", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("@/lib/user-assignee-sync", () => ({
  syncAssigneeFromUser: mocks.syncAssigneeFromUser,
  deleteAssigneeForUser: mocks.deleteAssigneeForUser,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { DELETE, PATCH } from "@/app/api/users/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isWorkspaceAdmin.mockImplementation((role: string) => ["admin"].includes(String(role).trim().toLowerCase()));
  mocks.db.get.mockResolvedValue({ company: "acme" });
});

describe("user id route", () => {
  it("rejects non-admin users", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "pm", company: "acme" });
    mocks.isAdminUser.mockReturnValue(false);

    const response = await PATCH(
      new Request("http://localhost/api/users/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "User", email: "user@example.com", role: "qa" }),
      }) as NextRequest,
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects disallowed roles", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "" });
    mocks.isAdminUser.mockReturnValue(true);
    mocks.normalizeRole.mockReturnValueOnce("guest");

    const response = await PATCH(
      new Request("http://localhost/api/users/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "User", email: "user@example.com", role: "guest" }),
      }) as NextRequest,
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Role is not allowed." });
  });

  it("updates user with password", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 1, role: "admin", company: "" });
    mocks.isAdminUser.mockReturnValue(true);

    const response = await PATCH(
      new Request("http://localhost/api/users/2", {
        method: "PATCH",
        body: JSON.stringify({ name: "User", email: "user@example.com", role: "fullstack", password: "secret1" }),
      }) as NextRequest,
      { params: Promise.resolve({ id: "2" }) },
    );

    expect(mocks.hashPassword).toHaveBeenCalledWith("secret1");
    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "User" SET "name" = ?, "email" = ?, "role" = ?, "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      ["User", "user@example.com", "fullstack", "hashed:secret1", "2"],
    );
    expect(mocks.syncAssigneeFromUser).toHaveBeenCalledWith({
      id: 2,
      company: "",
      name: "User",
      email: "user@example.com",
      role: "fullstack",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("blocks self deletion", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce({ id: 2, role: "admin", company: "" });
    mocks.isAdminUser.mockReturnValue(true);

    const response = await DELETE(
      new Request("http://localhost/api/users/2", { method: "DELETE" }) as NextRequest,
      { params: Promise.resolve({ id: "2" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Cannot delete your own account." });
  });
});
