import { NextRequest, NextResponse } from "next/server";
import { getInviteByToken, markInviteAccepted } from "@/lib/invites";
import { authEnabled, registerUser } from "@/lib/auth";
import { isInviteRole, normalizeRole } from "@/lib/roles";
import { checkCompanyUserLimit } from "@/lib/plan-limits";

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    company?: string;
    inviteToken?: string;
  } | null;
  const email = body?.email?.trim() || "";
  const password = body?.password || "";
  const name = body?.name?.trim() || "";
  const inviteToken = body?.inviteToken?.trim() || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  if (inviteToken) {
    const invite = await getInviteByToken(inviteToken);
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ error: "Invite is invalid." }, { status: 400 });
    }
    if (!isInviteRole(invite.role)) {
      return NextResponse.json({ error: "Invite role is not allowed." }, { status: 400 });
    }
    // Check user limit before allowing registration
    const inviteCompany = String(invite.company ?? "").trim();
    if (inviteCompany) {
      const limitCheck = await checkCompanyUserLimit(inviteCompany);
      if (!limitCheck.allowed) {
        return NextResponse.json({
          error: "USER_LIMIT_REACHED",
          current: limitCheck.current,
          max: limitCheck.max,
          plan: limitCheck.plan,
        }, { status: 403 });
      }
    }
    const result = await registerUser(email, password, name, normalizeRole(invite.role), String(invite.company ?? ""));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const consume = await markInviteAccepted(inviteToken, email);
    if ("error" in consume) {
      return NextResponse.json({ error: consume.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await registerUser(email, password, name, "admin", "");
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
