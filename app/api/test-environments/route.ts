import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/data-helpers";
import { environmentSchema, prepareVariablesForStorage, serializeEnvironment, workspaceScope } from "@/lib/test-environments";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  if (!scope) return NextResponse.json({ data: [] });

  const rows = await db.query<Record<string, unknown>>(
    `SELECT * FROM "TestEnvironment" WHERE "deletedAt" IS NULL${scope.andWhere} ORDER BY "project" ASC, "name" ASC`,
    scope.params,
  );
  return NextResponse.json({ data: JSON.parse(JSON.stringify(rows.map(serializeEnvironment))) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  if (!scope?.workspaceId) return NextResponse.json({ error: "Select a workspace first" }, { status: 400 });

  const parsed = environmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const { name, project, baseUrl, variables, enabled = true } = parsed.data;

  const row = await db.get<Record<string, unknown>>(
    `INSERT INTO "TestEnvironment" ("workspaceId", "project", "name", "baseUrl", "variables", "enabled")
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    [scope.workspaceId, project, name, baseUrl, JSON.stringify(prepareVariablesForStorage(variables)), enabled ? 1 : 0],
  );
  if (!row) return NextResponse.json({ error: "Failed to create environment" }, { status: 500 });

  await logActivity(scope.company, "TestEnvironment", String(row.id), "Created", `Environment "${name}" created`, user.name || user.email || "", undefined, scope.workspaceId);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(serializeEnvironment(row))) }, { status: 201 });
}
