import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

// GET /api/exploratory-sessions - list sessions for workspace
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { andWhere, params: qParams } = getAccessScope(user);
  const search = request.nextUrl.searchParams.get("q") || "";
  const status = request.nextUrl.searchParams.get("status") || "";
  const project = request.nextUrl.searchParams.get("project") || "";

  let extraWhere = "";
  const extraParams: unknown[] = [];

  if (status) {
    extraWhere += ' AND "status" = ?';
    extraParams.push(status);
  }
  if (project) {
    extraWhere += ' AND "project" = ?';
    extraParams.push(project);
  }
  if (search) {
    extraWhere += ' AND ("title" ILIKE ? OR "charter" ILIKE ? OR "tester" ILIKE ?)';
    extraParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const sessions = await db.query<Record<string, unknown>>(
    `SELECT * FROM "ExploratorySession"
     WHERE "deletedAt" IS NULL${andWhere}${extraWhere}
     ORDER BY "startedAt" DESC`,
    [...qParams, ...extraParams]
  );

  return NextResponse.json({ data: sessions });
}

// POST /api/exploratory-sessions - create a new exploratory charter session
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, workspaceId } = getAccessScope(user);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const {
    title,
    charter,
    project = "",
    environment = "staging",
    targetDurationMinutes = 45,
  } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const publicToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  await db.run(
    `INSERT INTO "ExploratorySession" (
      "company", "workspaceId", "publicToken", "title", "charter", "project",
      "environment", "tester", "targetDurationMinutes", "status", "notes", "startedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', '[]', CURRENT_TIMESTAMP)`,
    [
      company,
      workspaceId,
      publicToken,
      title.trim(),
      typeof charter === "string" ? charter.trim() : "",
      String(project || "").trim(),
      String(environment || "staging").trim(),
      user.name || user.email || "QA Engineer",
      Number(targetDurationMinutes) || 45,
    ]
  );

  const created = await db.get<Record<string, unknown>>(
    `SELECT * FROM "ExploratorySession"
     WHERE "publicToken" = ? AND "deletedAt" IS NULL
     ORDER BY "id" DESC LIMIT 1`,
    [publicToken]
  );

  if (!created) {
    return NextResponse.json({ error: "Failed to create exploratory session" }, { status: 500 });
  }

  await logActivity(
    company,
    "ExploratorySession",
    String(created.id),
    "Charter Started",
    `Exploratory charter "${title}" initiated (${targetDurationMinutes} min timebox)`,
    user.name || user.email || "",
    undefined,
    workspaceId
  );

  return NextResponse.json({ data: created }, { status: 201 });
}
