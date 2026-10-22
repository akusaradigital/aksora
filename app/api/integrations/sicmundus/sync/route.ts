import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  loginSicmundus,
  createSicmundusSubtask,
  createSicmundusTimeEntry,
  getSicmundusApiUrl,
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
      sicmundusTaskId: string;
      subtaskTitle: string;
      durationMinutes: number;
      date: string;
      notes?: string;
      username?: string;
      password?: string;
    };

    if (!body.sicmundusTaskId) {
      return NextResponse.json({ error: "Sicmundus parent task ID is required" }, { status: 400 });
    }
    if (!body.subtaskTitle) {
      return NextResponse.json({ error: "Subtask title is required" }, { status: 400 });
    }

    // 1. Authenticate with Sicmundus
    const auth = await loginSicmundus(body.username, body.password);
    const token = auth.token;
    const assigneeId = auth.user.id;

    // 2. Create subtask in Sicmundus
    const subtask = await createSicmundusSubtask(token, body.sicmundusTaskId, {
      title: body.subtaskTitle,
      assigneeId,
      dueDate: body.date,
    });

    // 3. Create time entry for the subtask
    const duration = Math.max(1, Number(body.durationMinutes) || 240);
    const entry = await createSicmundusTimeEntry(token, body.sicmundusTaskId, {
      subtaskId: subtask.id,
      durationMinutes: duration,
      date: body.date,
      notes: body.notes || "",
    });

    // 4. If an Aksora task ID was provided, sync duration back to local DB
    if (body.taskId) {
      try {
        await db.run(
          `UPDATE "Task" SET "durationMinutes" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
          [duration, body.taskId]
        );
        await logActivity(
          user.company || "",
          "Task",
          body.subtaskTitle,
          "Synced",
          `Logged ${duration}m to Sicmundus subtask: ${body.subtaskTitle}`,
          user.name || user.email || ""
        );
      } catch (err) {
        console.warn("Could not update local task duration after Sicmundus sync:", err);
      }
    }

    const sicmundusUrl = getSicmundusApiUrl().replace(/\/api$/, "");
    const taskLink = `${sicmundusUrl}/tasks?task=${encodeURIComponent(body.sicmundusTaskId)}`;

    return NextResponse.json({
      data: {
        success: true,
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
