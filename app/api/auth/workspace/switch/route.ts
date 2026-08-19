import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getCurrentUser, sessionCookieName } from "@/lib/auth";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { workspaceId?: number } | null;
  const workspaceId = Number(body?.workspaceId || 0);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace is required." }, { status: 400 });
  }

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  const membership = memberships.find((item) => Number(item.workspaceId) === workspaceId);
  if (!membership) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, workspaceId, role: membership.role, workspace: membership.name });
  response.cookies.set(
    sessionCookieName(),
    await createSessionToken(user.email, {
      id: user.id,
      name: user.name,
      role: membership.role,
      company: membership.name,
      activeWorkspaceId: workspaceId,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    },
  );
  return response;
}
