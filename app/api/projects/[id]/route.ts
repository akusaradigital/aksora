import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { invalidateDashboardCache } from "@/lib/data/data-dashboard-stats";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const { andWhere, params } = getAccessScope(user);

  try {
    const project = await db.get<{
      id: number;
      name: string;
      key: string;
      description: string;
      status: string;
      publicToken: string;
      createdAt: string;
      updatedAt: string;
      planCount: number;
      bugCount: number;
      taskCount: number;
    }>(
      `SELECT p."id", p."name", p."key", p."description", p."status", p."publicToken", p."createdAt", p."updatedAt",
        (SELECT COUNT(*) FROM "TestPlan" tp WHERE tp."project" = p."name" AND tp."deletedAt" IS NULL) as "planCount",
        (SELECT COUNT(*) FROM "Bug" b WHERE b."project" = p."name" AND b."deletedAt" IS NULL) as "bugCount",
        (SELECT COUNT(*) FROM "Task" t WHERE t."project" = p."name" AND t."deletedAt" IS NULL) as "taskCount"
       FROM "Project" p
       WHERE p."id" = CAST(? AS INTEGER) AND p."deletedAt" IS NULL${andWhere}
       LIMIT 1`,
      [projectId, ...params],
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (err) {
    console.error("Failed to fetch project:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const { andWhere, params, company, workspaceId } = getAccessScope(user);

  const existing = await db.get<{
    id: number;
    name: string;
    key: string;
    description: string;
    status: string;
    publicToken: string;
  }>(
    `SELECT "id", "name", "key", "description", "status", "publicToken"
     FROM "Project"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}
     LIMIT 1`,
    [projectId, ...params],
  );

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    key?: string;
    description?: string;
    status?: "active" | "archived";
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Missing update payload" }, { status: 400 });
  }

  const newName = body.name !== undefined ? String(body.name).trim() : existing.name;
  if (!newName) {
    return NextResponse.json({ error: "Project name cannot be empty" }, { status: 400 });
  }

  // Check duplicate if name changed
  if (newName.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = await db.get<{ id: number }>(
      `SELECT "id" FROM "Project" WHERE LOWER("name") = LOWER(?) AND "id" != CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere} LIMIT 1`,
      [newName, projectId, ...params],
    );
    if (dup) {
      return NextResponse.json({ error: `A project named "${newName}" already exists.` }, { status: 400 });
    }
  }

  const newKey = body.key !== undefined ? String(body.key).trim().toUpperCase() : existing.key;
  const newDesc = body.description !== undefined ? String(body.description).trim() : existing.description;
  const newStatus = body.status === "archived" ? "archived" : body.status === "active" ? "active" : existing.status;

  const actor = user.name || user.email || "";

  try {
    await db.run(
      `UPDATE "Project"
       SET "name" = ?, "key" = ?, "description" = ?, "status" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
      [newName, newKey, newDesc, newStatus, projectId, ...params],
    );

    // If project was renamed, cascade name update to child entities
    if (newName !== existing.name) {
      const childTables = ["TestPlan", "Bug", "Task", "TestSession", "Deployment", "MeetingNote"];
      for (const table of childTables) {
        try {
          await db.run(
            `UPDATE "${table}"
             SET "project" = ?
             WHERE "project" = ?${company ? ' AND "company" = ?' : ''}`,
            company ? [newName, existing.name, company] : [newName, existing.name],
          );
        } catch {
          // Non-fatal if table not present
        }
      }
    }

    const action = newStatus !== existing.status
      ? (newStatus === "archived" ? "Archived" : "Unarchived")
      : "Updated";

    await logActivity(
      company,
      "Project",
      newName,
      action,
      `Project "${newName}" ${action.toLowerCase()}`,
      actor,
      existing.publicToken,
      workspaceId,
    );

    invalidateDashboardCache(company);

    return NextResponse.json({
      data: {
        id: projectId,
        name: newName,
        key: newKey,
        description: newDesc,
        status: newStatus,
        publicToken: existing.publicToken,
      },
    });
  } catch (err) {
    console.error("Failed to update project:", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const projectId = parseInt(rawId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const { andWhere, params, company, workspaceId } = getAccessScope(user);

  const project = await db.get<{
    id: number;
    name: string;
    publicToken: string;
  }>(
    `SELECT "id", "name", "publicToken"
     FROM "Project"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}
     LIMIT 1`,
    [projectId, ...params],
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const cascadeQuery = url.searchParams.get("cascade") === "true";
  let cascadeBody = false;
  if (!cascadeQuery && request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { cascade?: boolean } | null;
    cascadeBody = Boolean(body?.cascade);
  }
  const isCascade = cascadeQuery || cascadeBody;

  // Check counts of associated active items
  const counts = await db.get<{
    planCount: number;
    bugCount: number;
    taskCount: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM "TestPlan" WHERE "project" = ? AND "deletedAt" IS NULL${company ? ' AND "company" = ?' : ''}) as "planCount",
      (SELECT COUNT(*) FROM "Bug" WHERE "project" = ? AND "deletedAt" IS NULL${company ? ' AND "company" = ?' : ''}) as "bugCount",
      (SELECT COUNT(*) FROM "Task" WHERE "project" = ? AND "deletedAt" IS NULL${company ? ' AND "company" = ?' : ''}) as "taskCount"`,
    company ? [project.name, company, project.name, company, project.name, company] : [project.name, project.name, project.name],
  );

  const planCount = Number(counts?.planCount || 0);
  const bugCount = Number(counts?.bugCount || 0);
  const taskCount = Number(counts?.taskCount || 0);
  const totalItems = planCount + bugCount + taskCount;

  if (totalItems > 0 && !isCascade) {
    return NextResponse.json(
      {
        error: `Cannot delete project "${project.name}" because it contains ${planCount} test plans, ${bugCount} bugs, and ${taskCount} tasks. Archive the project instead or confirm cascade deletion.`,
        counts: { planCount, bugCount, taskCount },
      },
      { status: 409 },
    );
  }

  const actor = user.name || user.email || "";

  try {
    // Soft-delete the project
    await db.run(
      `UPDATE "Project" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)${andWhere}`,
      [projectId, ...params],
    );

    // If cascade, also soft delete child entities
    if (isCascade && totalItems > 0) {
      const childTables = ["TestPlan", "Bug", "Task"];
      for (const table of childTables) {
        try {
          await db.run(
            `UPDATE "${table}"
             SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
             WHERE "project" = ? AND "deletedAt" IS NULL${company ? ' AND "company" = ?' : ''}`,
            company ? [project.name, company] : [project.name],
          );
        } catch {
          // Non-fatal
        }
      }
    }

    await logActivity(
      company,
      "Project",
      project.name,
      "Deleted",
      `Project "${project.name}" deleted${isCascade && totalItems > 0 ? " (cascade)" : ""}`,
      actor,
      project.publicToken,
      workspaceId,
    );

    invalidateDashboardCache(company);

    return NextResponse.json({ ok: true, deleted: project.name });
  } catch (err) {
    console.error("Failed to delete project:", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
