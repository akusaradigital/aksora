import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/data-helpers";
import { environmentSchema, parseVariables, prepareVariablesForStorage, serializeEnvironment, workspaceScope } from "@/lib/test-environments";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadScoped(id: string, scope: NonNullable<ReturnType<typeof workspaceScope>>) {
  return db.get<Record<string, unknown>>(
    `SELECT * FROM "TestEnvironment" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${scope.andWhere}`,
    [id, ...scope.params],
  );
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  const { id } = await params;
  const existing = scope ? await loadScoped(id, scope) : undefined;
  if (!scope || !existing) return NextResponse.json({ error: "Environment not found" }, { status: 404 });

  const parsed = environmentSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const b = parsed.data;

  const variables = b.variables
    ? JSON.stringify(prepareVariablesForStorage(b.variables, parseVariables(existing.variables)))
    : String(existing.variables ?? "");

  const row = await db.get<Record<string, unknown>>(
    `UPDATE "TestEnvironment" SET "name" = ?, "project" = ?, "baseUrl" = ?, "variables" = ?, "enabled" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? RETURNING *`,
    [
      b.name ?? existing.name,
      b.project ?? existing.project,
      b.baseUrl ?? existing.baseUrl,
      variables,
      b.enabled === undefined ? existing.enabled : b.enabled ? 1 : 0,
      existing.id,
    ],
  );
  if (!row) return NextResponse.json({ error: "Failed to update environment" }, { status: 500 });

  await logActivity(scope.company, "TestEnvironment", String(row.id), "Updated", `Environment "${row.name}" updated`, user.name || user.email || "", undefined, Number(row.workspaceId) || null);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(serializeEnvironment(row))) });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  const { id } = await params;
  const existing = scope ? await loadScoped(id, scope) : undefined;
  if (!scope || !existing) return NextResponse.json({ error: "Environment not found" }, { status: 404 });

  await db.run(`UPDATE "TestEnvironment" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [existing.id]);
  await logActivity(scope.company, "TestEnvironment", String(existing.id), "Deleted", `Environment "${existing.name}" deleted`, user.name || user.email || "", undefined, Number(existing.workspaceId) || null);
  return NextResponse.json({ data: { id: existing.id } });
}
