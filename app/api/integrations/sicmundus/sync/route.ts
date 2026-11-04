import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getSicmundusApiUrl,
  loginSicmundus,
  findOrCreateSicmundusTask,
  findOrCreateSicmundusSubtask,
  createSicmundusTimeEntry,
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
    const body = (await req.json()) as {
      taskId?: string | number;
      sicmundusTaskId?: string;
      taskTitle?: string;
      project?: string;
      category?: string;
      subtaskTitle: string;
      durationMinutes: number;
      date: string;
      notes?: string;
      username?: string;
      password?: string;
    };

    if (!body.subtaskTitle) {
      return NextResponse.json({ error: "Subtask title is required" }, { status: 400 });
    }

    // 1. Authenticate with Sicmundus
    const auth = await loginSicmundus(body.username, body.password);
    const token = auth.token;
    const assigneeId = auth.user.id;

    // 2. Resolve or auto-create parent task in Sicmundus if missing / auto
    let targetTaskId = body.sicmundusTaskId && body.sicmundusTaskId !== "auto" ? body.sicmundusTaskId : "";
    if (!targetTaskId) {
      const parentTask = await findOrCreateSicmundusTask(token, {
        title: body.taskTitle || body.subtaskTitle,
        project: body.project,
        category: body.category,
      });
      targetTaskId = parentTask.id;
    }

    // 3. Find existing matching subtask or create a new one (omitting due_date to bypass task due_date validation)
    const subtask = await findOrCreateSicmundusSubtask(token, targetTaskId, {
      title: body.subtaskTitle,
      assigneeId,
      dueDate: body.date,
    });

    // 4. Create time entry for the subtask
    const duration = Math.max(1, Number(body.durationMinutes) || 240);
    const entry = await createSicmundusTimeEntry(token, targetTaskId, {
      subtaskId: subtask.id,
      durationMinutes: duration,
      date: body.date,
      notes: body.notes || "",
    });

    // 5. Record the sync against the source Aksora work log and save duration + IDs
    if (body.taskId) {
      try {
        const companyFilter = user.role === "superadmin" ? "" : ' AND "company" = ?';
        const companyParams = user.role === "superadmin" ? [] : [user.company || ""];
        await db.run(
          `UPDATE "WorkLog" SET "durationMinutes" = ?, "sicmundusTaskId" = ?, "sicmundusSubtaskId" = ?, "sicmundusEntryId" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
          [duration, targetTaskId, subtask.id, entry.id, body.taskId, ...companyParams]
        );
        await logActivity(
          user.company || "",
          "WorkLog",
          body.subtaskTitle,
          "Synced",
          `Logged ${duration}m to Sicmundus subtask: ${body.subtaskTitle}`,
          user.name || user.email || "",
          undefined,
          user.workspaceId
        );
      } catch (err) {
        console.warn("Could not log Sicmundus sync activity:", err);
      }
    }

    const sicmundusUrl = getSicmundusApiUrl().replace(/\/api$/, "");
    const taskLink = `${sicmundusUrl}/tasks?task=${encodeURIComponent(targetTaskId)}`;

    return NextResponse.json({
      data: {
        success: true,
        taskId: targetTaskId,
        subtask,
        entry,
        durationMinutes: duration,
        date: body.date,
        sicmundusTaskUrl: taskLink,
      },
    });
  } catch (err) {
    console.error("Sicmundus sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync task to Sicmundus" },
      { status: 500 }
    );
  }
}
