import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { customRoleSchema, parseCapabilities, requireWorkspaceCapability } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

type RoleRow = { id: number; name: string; capabilities: string; enabled: number; members: number };

export async function GET() {
  const guard = await requireWorkspaceCapability(null);
  if ("error" in guard) return guard.error;
  const rows = await db.query<RoleRow>(
    `SELECT cr."id", cr."name", cr."capabilities", cr."enabled",
       (SELECT COUNT(*) FROM "WorkspaceMembership" wm WHERE wm."customRoleId" = cr."id" AND wm."workspaceId" = cr."workspaceId")::int AS "members"
     FROM "CustomRole" cr WHERE cr."workspaceId" = ? AND cr."deletedAt" IS NULL ORDER BY cr."name" ASC`,
    [guard.workspaceId],
  );
  return NextResponse.json({ data: rows.map((r) => ({ ...r, capabilities: parseCapabilities(r.capabilities) })) });
}

export async function POST(request: Request) {
  const guard = await requireWorkspaceCapability("roles.manage");
  if ("error" in guard) return guard.error;
  const parsed = customRoleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid role" }, { status: 400 });

  const { name, capabilities, enabled = true } = parsed.data;
  const row = await db.get<{ id: number }>(
    `INSERT INTO "CustomRole" ("workspaceId", "name", "capabilities", "enabled") VALUES (?, ?, ?, ?) RETURNING "id"`,
    [guard.workspaceId, name, JSON.stringify(capabilities), enabled ? 1 : 0],
  );
  await logActivity(guard.user.company, "custom-role", String(row?.id), "create", `Created role ${name}`, guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { id: row?.id, name, capabilities, enabled: enabled ? 1 : 0, members: 0 } }, { status: 201 });
}
