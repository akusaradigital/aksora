import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { customRoleSchema, requireWorkspaceCapability } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireWorkspaceCapability("roles.manage");
  if ("error" in guard) return guard.error;
  const id = Number((await params).id);
  const parsed = customRoleSchema.partial().safeParse(await request.json().catch(() => null));
  if (!id || !parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { name, capabilities, enabled } = parsed.data;
  const row = await db.get<{ id: number }>(
    `UPDATE "CustomRole" SET "name" = COALESCE(?, "name"), "capabilities" = COALESCE(?, "capabilities"),
       "enabled" = COALESCE(?, "enabled"), "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL RETURNING "id"`,
    [name ?? null, capabilities ? JSON.stringify(capabilities) : null, enabled === undefined ? null : enabled ? 1 : 0, id, guard.workspaceId],
  );
  if (!row) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  await logActivity(guard.user.company, "custom-role", String(id), "update", `Updated role ${name ?? id}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id } });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireWorkspaceCapability("roles.manage");
  if ("error" in guard) return guard.error;
  const id = Number((await params).id);
  const row = await db.get<{ id: number }>(
    `UPDATE "CustomRole" SET "deletedAt" = CURRENT_TIMESTAMP WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL RETURNING "id"`,
    [id, guard.workspaceId],
  );
  if (!row) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  // Members fall back to their built-in role preset.
  await db.run(`UPDATE "WorkspaceMembership" SET "customRoleId" = NULL WHERE "customRoleId" = ? AND "workspaceId" = ?`, [id, guard.workspaceId]);
  await logActivity(guard.user.company, "custom-role", String(id), "delete", `Deleted role #${id}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id } });
}
