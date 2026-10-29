import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";

export const dynamic = "force-dynamic";

// GET /api/canary - list all environment canaries
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { andWhere, params: qParams } = getAccessScope(user);
  const environment = request.nextUrl.searchParams.get("environment") || "";
  const project = request.nextUrl.searchParams.get("project") || "";

  let extraWhere = "";
  const extraParams: unknown[] = [];

  if (environment) {
    extraWhere += ' AND "environment" = ?';
    extraParams.push(environment);
  }
  if (project) {
    extraWhere += ' AND "project" = ?';
    extraParams.push(project);
  }

  const canaries = await db.query<Record<string, unknown>>(
    `SELECT * FROM "EnvironmentCanary"
     WHERE "deletedAt" IS NULL${andWhere}${extraWhere}
     ORDER BY "environment" ASC, "name" ASC`,
    [...qParams, ...extraParams]
  );

  return NextResponse.json({ data: canaries });
}

// POST /api/canary - create a new environment canary
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, workspaceId } = getAccessScope(user);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const {
    name,
    url,
    project = "",
    environment = "staging",
    method = "GET",
    expectedStatus = 200,
    headers = "",
  } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
    return NextResponse.json({ error: "valid http/https URL is required" }, { status: 400 });
  }

  await db.run(
    `INSERT INTO "EnvironmentCanary" (
      "company", "workspaceId", "name", "project", "environment",
      "url", "method", "expectedStatus", "headers", "active"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      company,
      workspaceId,
      name.trim(),
      String(project || "").trim(),
      String(environment || "staging").trim(),
      url.trim(),
      String(method || "GET").toUpperCase(),
      Number(expectedStatus) || 200,
      typeof headers === "string" ? headers : JSON.stringify(headers || {}),
    ]
  );

  const created = await db.get<Record<string, unknown>>(
    `SELECT * FROM "EnvironmentCanary"
     WHERE "name" = ? AND "url" = ? AND "deletedAt" IS NULL
     ORDER BY "id" DESC LIMIT 1`,
    [name.trim(), url.trim()]
  );

  await logActivity(
    company,
    "EnvironmentCanary",
    String(created?.id || 0),
    "Created",
    `Canary health monitor "${name}" added for ${environment} (${url})`,
    user.name || user.email || "",
    undefined,
    workspaceId
  );

  return NextResponse.json({ data: created }, { status: 201 });
}
