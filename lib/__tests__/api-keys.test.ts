import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    get: vi.fn(),
    query: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import {
  createApiKeyForUser,
  generateApiKey,
  hashApiKey,
  listApiKeysForUser,
  resolveApiKey,
  revokeApiKey,
} from "@/lib/api-keys";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.get.mockResolvedValue(undefined);
  mocks.db.query.mockResolvedValue([]);
  mocks.db.run.mockResolvedValue(undefined);
  mocks.db.transaction.mockImplementation(async (fn: () => Promise<unknown>) => fn());
});

describe("api-keys", () => {
  it("generates prefixed keys and hashes them", () => {
    const key = generateApiKey();
    expect(key.rawKey.startsWith("aksora_")).toBe(true);
    expect(key.prefix).toBe(key.rawKey.slice(0, 15));
    expect(hashApiKey(key.rawKey)).toHaveLength(64);
  });

  it("creates, lists, revokes, and resolves api keys", async () => {
    mocks.db.get.mockResolvedValueOnce({ id: 11 });
    const created = await createApiKeyForUser(5, "  Main key  ", 30);
    expect(created.id).toBe(11);
    expect(mocks.db.get).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "ApiKey" ("userId", "name", "keyHash", "keyPrefix", "expiresAt")'),
      [5, "Main key", expect.any(String), expect.any(String), 30, 30],
    );

    await listApiKeysForUser(5);
    expect(mocks.db.query).toHaveBeenCalledWith(
      expect.stringContaining('"expiresAt"'),
      [5],
    );

    mocks.db.get.mockResolvedValueOnce({ id: 11 });
    await expect(revokeApiKey(5, 11)).resolves.toBe(true);

    mocks.db.get
      .mockResolvedValueOnce({
        keyId: 11,
        id: 5,
        name: "API User",
        email: "api@example.com",
        role: "qa",
        company: "acme",
      })
      .mockResolvedValueOnce(undefined);
    await expect(resolveApiKey(created.rawKey)).resolves.toMatchObject({
      id: 5,
      email: "api@example.com",
      company: "acme",
    });
    expect(mocks.db.run).toHaveBeenCalledWith(
      'UPDATE "ApiKey" SET "lastUsedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
      [11],
    );
  });

  it("keeps api keys non-expiring by default", async () => {
    mocks.db.get.mockResolvedValueOnce({ id: 12 });
    await createApiKeyForUser(6, "Default key");
    expect(mocks.db.get).toHaveBeenCalledWith(
      expect.stringContaining('CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP + (? * INTERVAL \'1 day\') END'),
      [6, "Default key", expect.any(String), expect.any(String), null, null],
    );
  });

  it("skips expired api keys during resolution", async () => {
    mocks.db.get.mockResolvedValueOnce(undefined);
    await expect(resolveApiKey("aksora_invalid")).resolves.toBeNull();
    expect(mocks.db.get).toHaveBeenCalledWith(
      expect.stringContaining('"expiresAt" IS NULL OR k."expiresAt" > CURRENT_TIMESTAMP'),
      [hashApiKey("aksora_invalid")],
    );
  });
});
