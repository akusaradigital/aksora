import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { ApiUser } from "@/lib/auth-context";

type ApiKeyRow = {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

function normalizeName(name: string) {
  return String(name ?? "").trim();
}

export function generateApiKey() {
  const rawKey = `aksora_${randomBytes(32).toString("base64url")}`;
  return { rawKey, prefix: rawKey.slice(0, 15) };
}

export function hashApiKey(rawKey: string) {
  return createHash("sha256").update(String(rawKey ?? "")).digest("hex");
}

export async function createApiKeyForUser(userId: number, name: string, expiresInDays?: number | null) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error("API key name is required.");
  }

  const { rawKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const created = await db.get<{ id: number }>(
    `INSERT INTO "ApiKey" ("userId", "name", "keyHash", "keyPrefix", "expiresAt")
     VALUES (?, ?, ?, ?, CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP + (? * INTERVAL '1 day') END)
     RETURNING "id"`,
    [userId, normalizedName, keyHash, prefix, expiresInDays ?? null, expiresInDays ?? null],
  );

  if (!created?.id) {
    throw new Error("Failed to create API key.");
  }

  return { id: Number(created.id), rawKey, prefix };
}

export async function listApiKeysForUser(userId: number) {
  return db.query<ApiKeyRow>(
    `SELECT "id", "name", "keyPrefix", "createdAt", "lastUsedAt", "revokedAt", "expiresAt"
     FROM "ApiKey"
     WHERE "userId" = ?
     ORDER BY "createdAt" DESC`,
    [userId],
  );
}

export async function revokeApiKey(userId: number, keyId: number) {
  const revoked = await db.get<{ id: number }>(
    `UPDATE "ApiKey"
     SET "revokedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER) AND "revokedAt" IS NULL
     RETURNING "id"`,
    [keyId, userId],
  );
  return Boolean(revoked?.id);
}

export async function resolveApiKey(rawKey: string): Promise<ApiUser | null> {
  const keyHash = hashApiKey(rawKey);

  return db.transaction(async () => {
    const row = await db.get<{
      keyId: number;
      id: number;
      name: string | null;
      email: string | null;
      role: string | null;
      company: string | null;
    }>(
      `SELECT k."id" AS "keyId", u."id", u."name", u."email", u."role", u."company"
       FROM "ApiKey" k
       INNER JOIN "User" u ON u."id" = k."userId"
       WHERE k."keyHash" = ? AND k."revokedAt" IS NULL AND (k."expiresAt" IS NULL OR k."expiresAt" > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [keyHash],
    );

    if (!row) return null;

    await db.run('UPDATE "ApiKey" SET "lastUsedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)', [row.keyId]);

    return {
      id: Number(row.id),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      role: String(row.role ?? ""),
      company: String(row.company ?? ""),
    };
  });
}
