import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isInviteRole, isManagementAdmin, normalizeRole } from "@/lib/roles";
import { createInvite, listInvites } from "@/lib/invites";

type CreateInviteResult = Awaited<ReturnType<typeof createInvite>>;
type InviteLimitReachedResult = Extract<CreateInviteResult, { error: "USER_LIMIT_REACHED" }>;

function isInviteLimitReachedResult(result: CreateInviteResult): result is InviteLimitReachedResult {
  return "error" in result && result.error === "USER_LIMIT_REACHED";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const invites = await listInvites();
  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isManagementAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    role?: string;
    expiresInDays?: number;
  } | null;

  const result = await createInvite({
    role: isInviteRole(body?.role) ? normalizeRole(body?.role) : "qa",
    expiresInDays: body?.expiresInDays,
  });

  if ("error" in result) {
    if (isInviteLimitReachedResult(result)) {
      return NextResponse.json({
        error: "USER_LIMIT_REACHED",
        current: result.current,
        max: result.max,
        plan: result.plan,
      }, { status: 403 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  return NextResponse.json({
    invite: result,
    link: `${origin}/register?inviteToken=${result.token}`,
  });
}
