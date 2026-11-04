import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, makePublicToken } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { loginSicmundus, getSicmundusEntries, getSicmundusTasks } from "@/lib/sicmundus";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company, workspaceId } = getAccessScope(user);
  const targetWorkspaceId = workspaceId || 1;
  const targetCompany = company || "Akusara Project";
  const assigneeName = String(user.name || "Wahyu Priyono").trim();

  try {
    const auth = await loginSicmundus();
    const [tasks, entries] = await Promise.all([
      getSicmundusTasks(auth.token),
      getSicmundusEntries(auth.token),
    ]);

    const taskMap = new Map<string, { title: string; project_name: string; category?: string }>();
    for (const t of tasks) {
      taskMap.set(t.id, {
        title: t.title || "Daily Task",
        project_name: t.project_name || t.title || "Sicmundus",
        category: t.category || "Testing",
      });
    }

    const existingRows = await db.query<{ id: number; sicmundusEntryId: string; durationMinutes: number }>(
      'SELECT "id", "sicmundusEntryId", "durationMinutes" FROM "WorkLog" WHERE "deletedAt" IS NULL AND "sicmundusEntryId" IS NOT NULL'
    );
    const existingMap = new Map<string, { id: number; durationMinutes: number }>();
    for (const row of existingRows) {
      if (row.sicmundusEntryId) {
        existingMap.set(row.sicmundusEntryId, row);
      }
    }

    let newlyImported = 0;
    let updatedCount = 0;

    for (const entry of entries) {
      const entryId = entry.id;
      if (!entryId) continue;

      const dur = Math.max(1, entry.duration_minutes || 60);
      const existing = existingMap.get(entryId);

      if (existing) {
        if (existing.durationMinutes !== dur) {
          await db.run(
            'UPDATE "WorkLog" SET "durationMinutes" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
            [dur, existing.id]
          );
          updatedCount++;
        }
        continue;
      }

      // New entry from Sicmundus -> insert into Aksora
      const parentTask = taskMap.get(entry.task_id);
      const dateStr = entry.start_time ? entry.start_time.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const proj = parentTask?.project_name || parentTask?.title || "Sicmundus";
      const desc = parentTask?.title || "Daily QA & Engineering Work";
      const cat = parentTask?.category || "Testing";
      const notes = entry.notes || "";
      const publicToken = makePublicToken();

      await db.run(
        `INSERT INTO "WorkLog" (
          "company", "workspaceId", "publicToken", "date",
          "startTime", "endTime", "durationMinutes",
          "category", "project", "description", "output", "notes",
          "assignee", "sicmundusTaskId", "sicmundusSubtaskId", "sicmundusEntryId"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetCompany,
          targetWorkspaceId,
          publicToken,
          dateStr,
          entry.start_time || `${dateStr}T02:00:00.000Z`,
          entry.end_time || `${dateStr}T10:00:00.000Z`,
          dur,
          cat,
          proj,
          desc,
          notes,
          notes,
          assigneeName,
          entry.task_id || null,
          entry.subtask_id || null,
          entryId,
        ]
      );
      newlyImported++;
    }

    return NextResponse.json({
      success: true,
      totalInSicmundus: entries.length,
      newlyImported,
      updatedCount,
      message: `Sinkronisasi selesai! ${newlyImported} entri baru dimasukkan, ${updatedCount} entri diperbarui.`,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Sync Sicmundus Route] Error:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
