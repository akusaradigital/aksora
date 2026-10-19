import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/vault-crypto";

export type VaultEntryMeta = {
  id: number;
  title: string;
  username: string;
  url: string;
  category: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export async function listVaultEntriesForUser(userId: number) {
  return db.query<VaultEntryMeta>(
    `SELECT "id", "title", "username", "url", "category", "notes", "createdAt", "updatedAt"
     FROM "VaultEntry" WHERE "userId" = ? ORDER BY "updatedAt" DESC`,
    [userId],
  );
}

export async function createVaultEntryForUser(
  userId: number,
  fields: { title: string; username: string; url: string; category: string; password: string; notes: string },
) {
  const passwordEncrypted = encryptSecret(fields.password);
  const created = await db.get<{ id: number }>(
    `INSERT INTO "VaultEntry" ("userId", "title", "username", "url", "category", "passwordEncrypted", "notes")
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING "id"`,
    [userId, fields.title, fields.username, fields.url, fields.category, passwordEncrypted, fields.notes],
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
      entryId,
      userId,
    ],
  );
  return Boolean(updated?.id);
}

export async function deleteVaultEntryForUser(userId: number, entryId: number) {
  const deleted = await db.get<{ id: number }>(
    `DELETE FROM "VaultEntry" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER) RETURNING "id"`,
    [entryId, userId],
  );
  return Boolean(deleted?.id);
}

export async function revealVaultEntryPassword(userId: number, entryId: number): Promise<string | null> {
  const row = await db.get<{ passwordEncrypted: string }>(
    `SELECT "passwordEncrypted" FROM "VaultEntry" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)`,
    [entryId, userId],
  );
  if (!row) return null;
  return decryptSecret(row.passwordEncrypted);
}
