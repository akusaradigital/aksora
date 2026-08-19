import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { transferWorkspaceOwnership, updateWorkspaceSettings } from "@/lib/workspace-memberships";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const workspaceId = Number(id || 0);
  if (!workspaceId) {
    return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as {
    name?: string;
    accentColor?: string;
    templateKey?: string;
    iconPath?: string;
    transferToUserId?: number;
  } | null;

  const membership = await db.get<{ role: string }>(
    'SELECT "role" FROM "WorkspaceMembership" WHERE "workspaceId" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER)',
    [workspaceId, user.id],
  );
  if (!membership || String(membership.role || "").trim() !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (body?.transferToUserId) {
    await transferWorkspaceOwnership(workspaceId, user.id, Number(body.transferToUserId));
    return NextResponse.json({ ok: true, transferred: true });
  }

  await updateWorkspaceSettings(workspaceId, {
    name: String(body?.name || "").trim(),
    accentColor: String(body?.accentColor || "#2563eb"),
    templateKey: String(body?.templateKey || "custom"),
    iconPath: String(body?.iconPath || ""),
  });
  return NextResponse.json({ ok: true });
}
