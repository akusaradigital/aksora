import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getCurrentUser, sessionCookieName } from "@/lib/auth";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const workspaceName = String(request.nextUrl.searchParams.get("workspaceName") || "").trim();
  const to = String(request.nextUrl.searchParams.get("to") || "/dashboard").trim() || "/dashboard";
  if (!workspaceName) {
    return NextResponse.redirect(new URL(to, request.url));
  }

  const memberships = await getWorkspaceMembershipsForUser(user.id);
  const membership = memberships.find((item) => item.name === workspaceName);
  if (!membership) {
    return NextResponse.redirect(new URL("/settings/workspaces", request.url));
  }

  const response = NextResponse.redirect(new URL(to, request.url));
  response.cookies.set(
    sessionCookieName(),
    await createSessionToken(user.email, {
      id: user.id,
      name: user.name,
      role: membership.role,
      company: membership.name,
      activeWorkspaceId: membership.workspaceId,
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
