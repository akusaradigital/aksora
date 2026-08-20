import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getCurrentUser, sessionCookieName } from "@/lib/auth";
import { ensureWorkspace, ensureWorkspaceMembership, getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = String(body?.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const workspace = await ensureWorkspace(name, user.id);
  if (!workspace) {
    return NextResponse.json({ error: "Failed to create workspace." }, { status: 500 });
  }

  await ensureWorkspaceMembership(workspace.id, user.id, "admin");

  const response = NextResponse.json({ ok: true, workspace });
  response.cookies.set(
    sessionCookieName(),
    await createSessionToken(user.email, {
      id: user.id,
      name: user.name,
      role: "admin",
      company: workspace.name,
      activeWorkspaceId: workspace.id,
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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  return NextResponse.json({ workspaces: memberships });
}
