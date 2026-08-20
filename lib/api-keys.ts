import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { ApiUser } from "@/lib/auth-context";

type ApiKeyRow = {
  id: number;
  name: string;
  keyPrefix: string;
  workspaceId: number | null;
  allowedModules: string;
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

export async function createApiKeyForUser(
  userId: number,
  name: string,
  expiresInDays?: number | null,
  workspaceId?: number | null,
  allowedModules?: string[] | null,
) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error("API key name is required.");
  }

  const { rawKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const modulesString = !allowedModules || allowedModules.length === 0 || allowedModules.includes("*")
    ? "*"
    : allowedModules.map((m) => m.trim()).filter(Boolean).join(",");

  const created = await db.get<{ id: number }>(
    `INSERT INTO "ApiKey" ("userId", "workspaceId", "name", "keyHash", "keyPrefix", "allowedModules", "expiresAt")
     VALUES (?, CAST(? AS INTEGER), ?, ?, ?, ?, CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP + (? * INTERVAL '1 day') END)
     RETURNING "id"`,
    [userId, workspaceId ?? null, normalizedName, keyHash, prefix, modulesString, expiresInDays ?? null, expiresInDays ?? null],
  );

  if (!created?.id) {
    throw new Error("Failed to create API key.");
  }

  return { id: Number(created.id), rawKey, prefix };
}

export async function listApiKeysForUser(userId: number, workspaceId?: number | null) {
  const whereWorkspace = workspaceId !== undefined && workspaceId !== null ? ' AND "workspaceId" = CAST(? AS INTEGER)' : "";
  const params = workspaceId !== undefined && workspaceId !== null ? [userId, workspaceId] : [userId];

  return db.query<ApiKeyRow>(
    `SELECT "id", "name", "keyPrefix", "workspaceId", "allowedModules", "createdAt", "lastUsedAt", "revokedAt", "expiresAt"
     FROM "ApiKey"
     WHERE "userId" = ?${whereWorkspace}
     ORDER BY "createdAt" DESC`,
    params,
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
      workspaceId: number | null;
      allowedModules: string | null;
      id: number;
      name: string | null;
      email: string | null;
      role: string | null;
      company: string | null;
    }>(
      `SELECT k."id" AS "keyId", k."workspaceId", k."allowedModules", u."id", u."name", u."email", u."role", u."company"
       FROM "ApiKey" k
       INNER JOIN "User" u ON u."id" = k."userId"
       WHERE k."keyHash" = ? AND k."revokedAt" IS NULL AND (k."expiresAt" IS NULL OR k."expiresAt" > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [keyHash],
    );

    if (!row) return null;

    await db.run('UPDATE "ApiKey" SET "lastUsedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)', [row.keyId]);

    const allowedModulesRaw = String(row.allowedModules ?? "*").trim();
    const allowedModules = allowedModulesRaw === "*" || !allowedModulesRaw
      ? ["*"]
      : allowedModulesRaw.split(",").map((m) => m.trim()).filter(Boolean);

    return {
      id: Number(row.id),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      role: String(row.role ?? ""),
      company: String(row.company ?? ""),
      workspaceId: row.workspaceId ? Number(row.workspaceId) : null,
      allowedModules,
    };
  });
}
