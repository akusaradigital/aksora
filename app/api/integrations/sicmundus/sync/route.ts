import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSicmundusApiUrl, loginSicmundus, findOrCreateSicmundusSubtask, createSicmundusTimeEntry } from "@/lib/sicmundus";
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

    // 2. Find existing matching subtask or create a new one (reuses subtask if same work)
    const subtask = await findOrCreateSicmundusSubtask(token, body.sicmundusTaskId, {
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

    // 4. Record the sync against the source Aksora work log and save duration
    if (body.taskId) {
      try {
        const companyFilter = user.role === "superadmin" ? "" : ' AND "company" = ?';
        const companyParams = user.role === "superadmin" ? [] : [user.company || ""];
        await db.run(
          `UPDATE "WorkLog" SET "durationMinutes" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${companyFilter}`,
          [duration, body.taskId, ...companyParams]
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
