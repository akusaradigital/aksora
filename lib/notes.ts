import { db } from "@/lib/db";

export type NoteRow = {
  id: number;
  title: string;
  content: string;
  color: string;
  pinned: number;
  createdAt: string;
  updatedAt: string;
};

export async function listNotesForUser(userId: number) {
  return db.query<NoteRow>(
    `SELECT "id", "title", "content", "color", "pinned", "createdAt", "updatedAt"
     FROM "Note" WHERE "userId" = ? ORDER BY "pinned" DESC, "updatedAt" DESC`,
    [userId],
  );
}

export async function createNoteForUser(userId: number, title: string, content: string, color: string) {
  const created = await db.get<{ id: number }>(
    `INSERT INTO "Note" ("userId", "title", "content", "color") VALUES (?, ?, ?, ?) RETURNING "id"`,
    [userId, title, content, color],
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
      noteId,
      userId,
    ],
  );
  return Boolean(updated?.id);
}

export async function deleteNoteForUser(userId: number, noteId: number) {
  const deleted = await db.get<{ id: number }>(
    `DELETE FROM "Note" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER) RETURNING "id"`,
    [noteId, userId],
  );
  return Boolean(deleted?.id);
}
