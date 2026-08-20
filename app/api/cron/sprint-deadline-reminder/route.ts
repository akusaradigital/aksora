import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSprintDeadlineEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sprints ending tomorrow, still active.
  const sprints = await db.query<{ id: number; name: string; company: string; endDate: string }>(
    `SELECT "id", "name", "company", "endDate" FROM "Sprint"
     WHERE "status" = 'active' AND "deletedAt" IS NULL
       AND "endDate"::date = (CURRENT_DATE + INTERVAL '1 day')::date`
  );

  let emailed = 0;
  for (const sprint of sprints) {
    const rows = await db.query<{ assignee: string; taskCount: number; email: string | null }>(
      `SELECT t."assignee", COUNT(*)::int as "taskCount", a."email"
       FROM "Task" t
       LEFT JOIN "Assignee" a ON a."name" = t."assignee" AND a."company" = t."company" AND a."deletedAt" IS NULL
       WHERE t."sprintId" = ? AND t."deletedAt" IS NULL AND t."status" != 'done'
         AND COALESCE(t."assignee", '') != ''
       GROUP BY t."assignee", a."email"`,
      [sprint.id]
    );
    for (const row of rows) {
      if (!row.email) continue;
      sendSprintDeadlineEmail(row.email, sprint.name, sprint.endDate, row.taskCount);
      emailed++;
    }
  }

  return NextResponse.json({ ok: true, sprints: sprints.length, emailed });
}
