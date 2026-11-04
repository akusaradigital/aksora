import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getSicmundusApiUrl,
  loginSicmundus,
  getSicmundusTasks,
  getSicmundusEntries,
} from "@/lib/sicmundus";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as {
      username?: string;
      password?: string;
    };

    // 1. Authenticate with Sicmundus
    const auth = await loginSicmundus(body.username, body.password);
    const token = auth.token;
    const userId = auth.user.id;

    // 2. Fetch tasks and entries from Sicmundus
    const tasks = await getSicmundusTasks(token, userId);
    const entries = await getSicmundusEntries(token);

    const company = user.company || "Akusara Project";
    const workspaceId = user.workspaceId || 15;

    let tasksSynced = 0;
    let entriesSynced = 0;

    // 3. Sync Tasks to Aksora
    for (const t of tasks) {
      const pName = t.project_name || "Sicmundus";
      const statusMap: Record<string, string> = {
        backlog: "backlog",
        todo: "todo",
        in_progress: "in_progress",
        need_to_test: "need_to_test",
        completed: "completed",
        hold: "hold",
      };
      const status = statusMap[t.status || ""] || "in_progress";
      const priority =
        t.priority === "urgent"
          ? "P0"
          : t.priority === "high"
          ? "P1"
          : t.priority === "low"
          ? "P3"
          : "P2";
      const duration = Number(t.total_minutes) || 0;
      const dueDate = (t.due_date || "").slice(0, 10) || null;

      const existing = await db.get<{ id: number }>(
        `SELECT id FROM "Task" WHERE "sicmundusTaskId" = ? OR (title = ? AND project = ?)`,
        [t.id, t.title, pName]
      );

      if (!existing) {
        const tokenStr = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await db.run(
          `INSERT INTO "Task" (
            company, "workspaceId", "publicToken", title, project, "relatedFeature",
            category, status, priority, "endDate", description,
            "durationMinutes", "sicmundusTaskId", assignee
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            company,
            workspaceId,
            tokenStr,
            t.title,
            pName,
            pName,
            t.category || "Feature",
            status,
            priority,
            dueDate,
            t.description || t.title,
            duration,
            t.id,
            user.name || "Wahyu Priyono",
          ]
        );
        tasksSynced++;
      } else {
        await db.run(
          `UPDATE "Task" SET status = ?, priority = ?, "durationMinutes" = ?, "sicmundusTaskId" = ?, "endDate" = COALESCE(NULLIF(?, ''), "endDate"), "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
          [status, priority, duration, t.id, dueDate || "", existing.id]
        );
        tasksSynced++;
      }
    }

    // 4. Sync Entries to WorkLogs
    for (const e of entries) {
      const startIso = e.start_time || "";
      const dateStr = startIso.slice(0, 10);
      if (!dateStr) continue;

      const startTimeStr = startIso.length >= 16 ? startIso.slice(11, 16) : "09:00";
      const endIso = e.end_time || "";
      const endTimeStr = endIso.length >= 16 ? endIso.slice(11, 16) : "17:00";
      const dur = Number(e.duration_minutes) || 240;

      const parentTask = tasks.find((t) => t.id === e.task_id);
      const projectName = parentTask?.project_name || "Sicmundus";
      const title =
        e.notes && e.notes.length > 5 ? e.notes : (parentTask?.title || "Engineering Task");

      const existing = await db.get<{ id: number }>(
        `SELECT id FROM "WorkLog" WHERE "sicmundusEntryId" = ? OR ("sicmundusTaskId" = ? AND date = ? AND "durationMinutes" = ?)`,
        [e.id, e.task_id, dateStr, dur]
      );

      if (!existing) {
        const tokenStr = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await db.run(
          `INSERT INTO "WorkLog" (
            company, "workspaceId", "publicToken", date, "startTime", "endTime",
            "durationMinutes", category, project, description, notes, assignee,
            "sicmundusTaskId", "sicmundusSubtaskId", "sicmundusEntryId"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            company,
            workspaceId,
            tokenStr,
            dateStr,
            startTimeStr,
            endTimeStr,
            dur,
            "testing",
            projectName,
            title,
            e.notes || "",
            user.name || "Wahyu Priyono",
            e.task_id,
            e.subtask_id || "",
            e.id,
          ]
        );
        entriesSynced++;
      } else {
        await db.run(
          `UPDATE "WorkLog" SET date = COALESCE(NULLIF(date, ''), ?), "startTime" = COALESCE(NULLIF("startTime", ''), ?), "endTime" = COALESCE(NULLIF("endTime", ''), ?), "durationMinutes" = ?, notes = COALESCE(NULLIF(notes, ''), ?), "sicmundusEntryId" = ?, "sicmundusSubtaskId" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ?`,
          [dateStr, startTimeStr, endTimeStr, dur, e.notes || "", e.id, e.subtask_id || "", existing.id]
        );
        entriesSynced++;
      }
    }

    await logActivity(
      company,
      "Sicmundus",
      "Full Sync",
      "Completed",
      `Synchronized ${tasksSynced} tasks and ${entriesSynced} time entries from Sicmundus.`,
      user.name || user.email || "",
      undefined,
      workspaceId
    );

    return NextResponse.json({
      data: {
        success: true,
        tasksSynced,
        entriesSynced,
        totalTasks: tasks.length,
        totalEntries: entries.length,
      },
    });
  } catch (err) {
    console.error("Sicmundus full sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to run full Sicmundus sync" },
      { status: 500 }
    );
  }
}
