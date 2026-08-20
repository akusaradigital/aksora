import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessScope, logActivity, deriveSprintStatus } from "@/lib/data-helpers";
import { invalidateDashboardCache } from "@/lib/data/data-dashboard-stats";

export const dynamic = "force-dynamic";

type SprintRow = {
  id: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  company: string;
  workspaceId: number | null;
};

/**
 * POST /api/sprints/[id]/lifecycle
 * body: { action: "start" | "complete"; rolloverToSprintId?: number }
 *
 * start   — enforce one active sprint per workspace, set status='active', fill startDate if unset.
 * complete — set status='completed', rollover uncompleted tasks/bugs to rolloverToSprintId or backlog.
 * velocity — GET via query ?action=velocity, returns completed/total counts for a sprint.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const sprintId = parseInt(rawId, 10);
  if (!sprintId) return NextResponse.json({ error: "Invalid sprint id" }, { status: 400 });

  const body = await request.json().catch(() => ({})) as {
    action?: string;
    rolloverToSprintId?: number | null;
  };
  const { action, rolloverToSprintId = null } = body;

  if (action !== "start" && action !== "complete") {
    return NextResponse.json({ error: "action must be 'start' or 'complete'" }, { status: 400 });
  }

  const scope = getAccessScope(user);
  const { company, andWhere, params: qp } = scope;
  const actor = user.name || user.email || "";

  const sprint = await db.get<SprintRow>(
    `SELECT "id","name","status","startDate","endDate","company","workspaceId" FROM "Sprint" WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
    [sprintId, ...qp],
  );
  if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  if (action === "start") {
    if (sprint.status === "active") {
      return NextResponse.json({ error: "Sprint is already active" }, { status: 409 });
    }

    // Deactivate any other active sprint in this workspace
    if (scope.workspaceId) {
      await db.run(
        `UPDATE "Sprint" SET "status" = 'planned', "updatedAt" = CURRENT_TIMESTAMP
         WHERE "status" = 'active' AND "workspaceId" = ? AND "id" != CAST(? AS INTEGER)`,
        [scope.workspaceId, sprintId],
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    await db.run(
      `UPDATE "Sprint" SET "status" = 'active',
        "startDate" = CASE WHEN COALESCE("startDate",'') = '' THEN ? ELSE "startDate" END,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
      [today, sprintId, ...qp],
    );
    await logActivity(company, "Sprint", sprint.name, "Started", `Sprint "${sprint.name}" started`, actor);
    invalidateDashboardCache(company);
    return NextResponse.json({ ok: true, action: "started" });
  }

  // action === "complete"
  if (sprint.status === "completed") {
    return NextResponse.json({ error: "Sprint is already completed" }, { status: 409 });
  }

  // Validate rollover target exists (if provided)
  if (rolloverToSprintId) {
    const target = await db.get<{ id: number }>(
      `SELECT "id" FROM "Sprint" WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
      [rolloverToSprintId, ...qp],
    );
    if (!target) return NextResponse.json({ error: "Rollover target sprint not found" }, { status: 404 });
  }

  await db.transaction(async () => {
    // Mark sprint completed
    const endDate = new Date().toISOString().slice(0, 10);
    await db.run(
      `UPDATE "Sprint" SET "status" = 'completed',
        "endDate" = CASE WHEN COALESCE("endDate",'') = '' THEN ? ELSE "endDate" END,
        "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
      [endDate, sprintId, ...qp],
    );

    // Rollover uncompleted tasks
    const newSprintId = rolloverToSprintId ?? null;
    const doneTaskStatuses = ["done", "closed", "passed", "cancelled"];
    const doneBugStatuses = ["Resolved", "Closed", "Won't Fix"];

    const taskPlaceholders = doneTaskStatuses.map(() => "?").join(", ");
    const bugPlaceholders = doneBugStatuses.map(() => "?").join(", ");

    if (scope.workspaceId) {
      await db.run(
        `UPDATE "Task" SET "sprintId" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP
         WHERE "sprintId" = CAST(? AS INTEGER) AND "status" NOT IN (${taskPlaceholders})
           AND "workspaceId" = ? AND "deletedAt" IS NULL`,
        [newSprintId, sprintId, ...doneTaskStatuses, scope.workspaceId],
      );
      await db.run(
        `UPDATE "Bug" SET "sprintId" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP
         WHERE "sprintId" = CAST(? AS INTEGER) AND "status" NOT IN (${bugPlaceholders})
           AND "workspaceId" = ? AND "deletedAt" IS NULL`,
        [newSprintId, sprintId, ...doneBugStatuses, scope.workspaceId],
      );
    } else {
      // ponytail: company fallback for legacy rows without workspaceId
      await db.run(
        `UPDATE "Task" SET "sprintId" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP
         WHERE "sprintId" = CAST(? AS INTEGER) AND "status" NOT IN (${taskPlaceholders})
           AND "company" = ? AND "deletedAt" IS NULL`,
        [newSprintId, sprintId, ...doneTaskStatuses, company],
      );
      await db.run(
        `UPDATE "Bug" SET "sprintId" = CAST(? AS INTEGER), "updatedAt" = CURRENT_TIMESTAMP
         WHERE "sprintId" = CAST(? AS INTEGER) AND "status" NOT IN (${bugPlaceholders})
           AND "company" = ? AND "deletedAt" IS NULL`,
        [newSprintId, sprintId, ...doneBugStatuses, company],
      );
    }
  });

  await logActivity(
    company, "Sprint", sprint.name, "Completed",
    `Sprint "${sprint.name}" completed. Uncompleted items rolled to ${rolloverToSprintId ? `sprint #${rolloverToSprintId}` : "backlog"}`,
    actor,
  );
  invalidateDashboardCache(company);
  return NextResponse.json({ ok: true, action: "completed", rolledTo: rolloverToSprintId ?? "backlog" });
}

/** GET /api/sprints/[id]/lifecycle?action=velocity */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const sprintId = parseInt(rawId, 10);
  if (!sprintId) return NextResponse.json({ error: "Invalid sprint id" }, { status: 400 });

  const scope = getAccessScope(user);
  const { andWhere, params: qp } = scope;

  const sprint = await db.get<{ id: number; name: string }>(
    `SELECT "id","name" FROM "Sprint" WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
    [sprintId, ...qp],
  );
  if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  const doneTaskStatuses = ["done", "closed", "passed", "cancelled"];
  const taskPlaceholders = doneTaskStatuses.map(() => "?").join(", ");

  const [taskStats, bugStats] = await Promise.all([
    db.get<{ total: number; completed: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN "status" IN (${taskPlaceholders}) THEN 1 ELSE 0 END) AS completed
       FROM "Task"
       WHERE "sprintId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL`,
      [...doneTaskStatuses, sprintId],
    ),
    db.get<{ total: number; completed: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN "status" IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS completed
       FROM "Bug"
       WHERE "sprintId" = CAST(? AS INTEGER) AND "deletedAt" IS NULL`,
      [sprintId],
    ),
  ]);

  return NextResponse.json({
    sprintId,
    sprintName: sprint.name,
    tasks: { total: Number(taskStats?.total ?? 0), completed: Number(taskStats?.completed ?? 0) },
    bugs: { total: Number(bugStats?.total ?? 0), completed: Number(bugStats?.completed ?? 0) },
    velocity: Number(taskStats?.completed ?? 0) + Number(bugStats?.completed ?? 0),
  });
}
