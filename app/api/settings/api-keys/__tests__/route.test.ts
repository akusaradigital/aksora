import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createApiKeyForUser: vi.fn(),
  listApiKeysForUser: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/api-keys", () => ({
  createApiKeyForUser: mocks.createApiKeyForUser,
  listApiKeysForUser: mocks.listApiKeysForUser,
  revokeApiKey: mocks.revokeApiKey,
}));

import { DELETE, GET, POST } from "../route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: 7, name: "Admin", email: "admin@example.com", role: "superadmin", company: "" });
  mocks.listApiKeysForUser.mockResolvedValue([]);
  mocks.createApiKeyForUser.mockResolvedValue({ id: 1, rawKey: "aksora_test", prefix: "aksora_test" });
  mocks.revokeApiKey.mockResolvedValue(true);
});

describe("settings api keys route", () => {
  it("returns api keys with expiresAt", async () => {
    mocks.listApiKeysForUser.mockResolvedValueOnce([
      {
        id: 1,
        name: "Main",
        keyPrefix: "aksora_abc",
        createdAt: "2026-08-14T00:00:00.000Z",
        lastUsedAt: null,
        revokedAt: null,
        expiresAt: "2026-09-14T00:00:00.000Z",
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(payload.data[0]).toMatchObject({ expiresAt: "2026-09-14T00:00:00.000Z" });
  });

  it("rejects invalid expiresInDays", async () => {
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "Main", expiresInDays: 0 }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
    expect(mocks.createApiKeyForUser).not.toHaveBeenCalled();
  });

  it("creates api keys with expiry days", async () => {
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "Main", expiresInDays: 90 }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.createApiKeyForUser).toHaveBeenCalledWith(7, "Main", 90, null, ["*"], "write");
    expect(payload.data).toMatchObject({ id: 1, rawKey: "aksora_test" });
  });

  it("rejects an invalid scope", async () => {
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "Main", scope: "delete-everything" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
    expect(mocks.createApiKeyForUser).not.toHaveBeenCalled();
  });

  it("passes through a read-only scope", async () => {
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: "Read only", scope: "read" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(201);
    expect(mocks.createApiKeyForUser).toHaveBeenCalledWith(7, "Read only", undefined, null, ["*"], "read");
  });

  it("revokes by id", async () => {
    const request = new NextRequest("http://localhost/api/settings/api-keys?id=12", { method: "DELETE" });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(mocks.revokeApiKey).toHaveBeenCalledWith(7, 12);
  });
});
