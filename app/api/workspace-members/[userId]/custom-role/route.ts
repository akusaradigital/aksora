import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { requireWorkspaceCapability } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ customRoleId: z.number().int().positive().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const guard = await requireWorkspaceCapability("roles.manage");
  if ("error" in guard) return guard.error;
  const userId = Number((await params).userId);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!userId || !parsed.success) return NextResponse.json({ error: "customRoleId must be a role id or null" }, { status: 400 });

  const { customRoleId } = parsed.data;
  if (customRoleId) {
    const role = await db.get<{ id: number }>(
      `SELECT "id" FROM "CustomRole" WHERE "id" = ? AND "workspaceId" = ? AND "deletedAt" IS NULL`,
      [customRoleId, guard.workspaceId],
    );
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const row = await db.get<{ id: number }>(
    `UPDATE "WorkspaceMembership" SET "customRoleId" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "workspaceId" = ? AND "userId" = ? RETURNING "id"`,
    [customRoleId, guard.workspaceId, userId],
  );
  if (!row) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  await logActivity(guard.user.company, "workspace-member", String(userId), "update", customRoleId ? `Assigned custom role #${customRoleId}` : "Cleared custom role", guard.user.name, undefined, guard.workspaceId);
  return NextResponse.json({ data: { userId, customRoleId } });
}
