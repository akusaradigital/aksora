import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { encryptSecret, decryptSecret } from "@/lib/vault-crypto";

export type VaultEntryMeta = {
  id: number;
  uuid?: string;
  workspaceId?: number | null;
  title: string;
  username: string;
  url: string;
  category: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

async function ensureVaultTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS "VaultEntry" (
      "id" SERIAL PRIMARY KEY,
      "uuid" TEXT,
      "workspaceId" INTEGER,
      "userId" INTEGER NOT NULL,
      "title" TEXT NOT NULL DEFAULT '',
      "username" TEXT NOT NULL DEFAULT '',
      "url" TEXT NOT NULL DEFAULT '',
      "category" TEXT NOT NULL DEFAULT 'general',
      "passwordEncrypted" TEXT NOT NULL,
      "notes" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function listVaultEntriesForUser(userId: number, workspaceId?: number | null) {
  await ensureVaultTable();
  const wsFilter = workspaceId ? ' AND ("workspaceId" = CAST(? AS INTEGER) OR "workspaceId" IS NULL)' : "";
  const params = workspaceId ? [Number(userId), Number(workspaceId)] : [Number(userId)];
  return db.query<VaultEntryMeta>(
    `SELECT "id", "uuid", "workspaceId", "title", "username", "url", "category", "notes", "createdAt", "updatedAt"
     FROM "VaultEntry" WHERE "userId" = CAST(? AS INTEGER)${wsFilter} ORDER BY "updatedAt" DESC`,
    params,
  );
}

export async function createVaultEntryForUser(
  userId: number,
  fields: { title: string; username: string; url: string; category: string; password: string; notes: string; workspaceId?: number | null },
) {
  await ensureVaultTable();
  const passwordEncrypted = encryptSecret(fields.password);
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new Error("Invalid user ID.");
  }
  const itemUuid = randomUUID();
  const created = await db.get<{ id: number; uuid: string }>(
    `INSERT INTO "VaultEntry" ("uuid", "workspaceId", "userId", "title", "username", "url", "category", "passwordEncrypted", "notes")
     VALUES (?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?, ?, ?, ?) RETURNING "id", "uuid"`,
    [itemUuid, fields.workspaceId ?? null, uid, fields.title, fields.username, fields.url, fields.category, passwordEncrypted, fields.notes],
  );
  if (!created?.id) {
    throw new Error("Failed to create vault entry.");
  }
  return Number(created.id);
}

export async function updateVaultEntryForUser(
  userId: number,
  entryId: number,
  fields: { title?: string; username?: string; url?: string; category?: string; password?: string; notes?: string },
) {
  await ensureVaultTable();
  const passwordEncrypted = fields.password !== undefined ? encryptSecret(fields.password) : null;
  const updated = await db.get<{ id: number }>(
    `UPDATE "VaultEntry"
     SET "title" = COALESCE(?, "title"), "username" = COALESCE(?, "username"), "url" = COALESCE(?, "url"),
         "category" = COALESCE(?, "category"), "passwordEncrypted" = COALESCE(?, "passwordEncrypted"),
         "notes" = COALESCE(?, "notes"), "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)
     RETURNING "id"`,
    [
      fields.title ?? null,
      fields.username ?? null,
      fields.url ?? null,
      fields.category ?? null,
      passwordEncrypted,
      fields.notes ?? null,
      Number(entryId),
      Number(userId),
    ],
  );
  return Boolean(updated?.id);
}

export async function deleteVaultEntryForUser(userId: number, entryId: number) {
  await ensureVaultTable();
  const deleted = await db.get<{ id: number }>(
    `DELETE FROM "VaultEntry" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER) RETURNING "id"`,
    [Number(entryId), Number(userId)],
  );
  return Boolean(deleted?.id);
}

export async function revealVaultEntryPassword(userId: number, entryId: number): Promise<string | null> {
  await ensureVaultTable();
  const row = await db.get<{ passwordEncrypted: string }>(
    `SELECT "passwordEncrypted" FROM "VaultEntry" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)`,
    [Number(entryId), Number(userId)],
  );
  if (!row) return null;
  return decryptSecret(row.passwordEncrypted);
}
