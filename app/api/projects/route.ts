import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { db } from "@/lib/db";
import { invalidateDashboardCache } from "@/lib/data/data-dashboard-stats";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { andWhere, params } = getAccessScope(user);

  try {
    const projects = await db.query<{
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
       WHERE p."deletedAt" IS NULL${andWhere}
       ORDER BY p."name" ASC`,
      params,
    );

    return NextResponse.json({ data: projects });
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    name?: string;
    key?: string;
    description?: string;
  } | null;

  const name = String(body?.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  const { andWhere, params, company, workspaceId } = getAccessScope(user);

  try {
    // Check duplicate project name within workspace
    const existing = await db.get<{ id: number }>(
      `SELECT "id" FROM "Project" WHERE LOWER("name") = LOWER(?) AND "deletedAt" IS NULL${andWhere} LIMIT 1`,
      [name, ...params],
    );

    if (existing) {
      return NextResponse.json(
        { error: `A project with the name "${name}" already exists.` },
        { status: 400 },
      );
    }

    // Generate project key if not provided
    let key = String(body?.key || "").trim().toUpperCase();
    if (!key) {
      const words = name.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        key = words.map((w) => w[0]).join("").slice(0, 5).toUpperCase();
      } else if (words.length === 1) {
        key = words[0].slice(0, 4).toUpperCase();
      }
    }
    if (key.length < 2) key = "PRJ";

    const description = String(body?.description || "").trim();
    const actor = user.name || user.email || "";

    const inserted = await db.get<{
      id: number;
      name: string;
      key: string;
      description: string;
      status: string;
      publicToken: string;
      createdAt: string;
    }>(
      `INSERT INTO "Project" ("name", "key", "description", "company", "workspaceId", "status", "publicToken")
       VALUES (?, ?, ?, ?, ?, 'active', md5(random()::text || clock_timestamp()::text))
       RETURNING "id", "name", "key", "description", "status", "publicToken", "createdAt"`,
      [name, key, description, company, workspaceId],
    );

    if (inserted) {
      await logActivity(
        company,
        "Project",
        inserted.name,
        "Created",
        `Project "${inserted.name}" created`,
        actor,
        inserted.publicToken,
        workspaceId,
      );
    }

    invalidateDashboardCache(company);

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (err) {
    console.error("Failed to create project:", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
