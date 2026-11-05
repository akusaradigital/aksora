import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export type NoteRow = {
  id: number;
  uuid?: string;
  workspaceId?: number | null;
  title: string;
  content: string;
  color: string;
  pinned: number;
  createdAt: string;
  updatedAt: string;
};

async function ensureNotesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS "Note" (
      "id" SERIAL PRIMARY KEY,
      "uuid" TEXT,
      "workspaceId" INTEGER,
      "userId" INTEGER NOT NULL,
      "title" TEXT NOT NULL DEFAULT '',
      "content" TEXT NOT NULL DEFAULT '',
      "color" TEXT NOT NULL DEFAULT 'default',
      "pinned" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function listNotesForUser(userId: number, workspaceId?: number | null) {
  await ensureNotesTable();
  const wsFilter = workspaceId ? ' AND ("workspaceId" = CAST(? AS INTEGER) OR "workspaceId" IS NULL)' : "";
  const params = workspaceId ? [Number(userId), Number(workspaceId)] : [Number(userId)];
  return db.query<NoteRow>(
    `SELECT "id", "uuid", "workspaceId", "title", "content", "color", "pinned", "createdAt", "updatedAt"
     FROM "Note" WHERE "userId" = CAST(? AS INTEGER)${wsFilter} ORDER BY "pinned" DESC, "updatedAt" DESC`,
    params,
  );
}

export async function createNoteForUser(userId: number, title: string, content: string, color: string, workspaceId?: number | null) {
  await ensureNotesTable();
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new Error("Invalid user ID.");
  }
  const itemUuid = randomUUID();
  const created = await db.get<{ id: number; uuid: string }>(
    `INSERT INTO "Note" ("uuid", "workspaceId", "userId", "title", "content", "color")
     VALUES (?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?) RETURNING "id", "uuid"`,
    [itemUuid, workspaceId ?? null, uid, title, content, color],
  );
  if (!created?.id) {
    throw new Error("Failed to create note.");
  }
  return Number(created.id);
}

export async function updateNoteForUser(
  userId: number,
  noteId: number,
  fields: { title?: string; content?: string; color?: string; pinned?: boolean },
) {
  await ensureNotesTable();
  const updated = await db.get<{ id: number }>(
    `UPDATE "Note"
     SET "title" = COALESCE(?, "title"), "content" = COALESCE(?, "content"), "color" = COALESCE(?, "color"),
         "pinned" = COALESCE(?, "pinned"), "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)
     RETURNING "id"`,
    [
      fields.title ?? null,
      fields.content ?? null,
      fields.color ?? null,
      fields.pinned === undefined ? null : fields.pinned ? 1 : 0,
      Number(noteId),
      Number(userId),
    ],
  );
  return Boolean(updated?.id);
}

export async function deleteNoteForUser(userId: number, noteId: number) {
  await ensureNotesTable();
  const deleted = await db.get<{ id: number }>(
    `DELETE FROM "Note" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER) RETURNING "id"`,
    [Number(noteId), Number(userId)],
  );
  return Boolean(deleted?.id);
}
