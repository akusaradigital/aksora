import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getInviteByToken, markInviteAccepted } from "@/lib/invites";
import { authEnabled, registerUser } from "@/lib/auth";
import { isInviteRole, normalizeRole } from "@/lib/roles";
import { checkCompanyUserLimit } from "@/lib/plan-limits";
import { ensureWorkspaceForUser, ensureWorkspaceMembership } from "@/lib/workspace-memberships";
import { sendWelcomeEmail, sendInviteAcceptedEmail, sendOtpEmail, emailEnabled } from "@/lib/email";
import { rateLimitKey, isRateLimited, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { isVpnOrHostingIp } from "@/lib/ip-reputation";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const OTP_TTL_MS = 10 * 60 * 1000;

async function issueOtp(userId: number, email: string) {
  const code = String(randomInt(100000, 1000000));
  const { db } = await import("@/lib/db");
  await db.run(
    'UPDATE "User" SET "emailVerified" = 0, "otpCode" = ?, "otpExpiresAt" = ?, "otpAttempts" = 0 WHERE "id" = CAST(? AS INTEGER)',
    [code, new Date(Date.now() + OTP_TTL_MS).toISOString(), userId],
  );
  sendOtpEmail(email, code);
}

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
  const turnstileToken = (body as { turnstileToken?: string } | null)?.turnstileToken?.trim() || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const limitKey = rateLimitKey(ip, email);
  const { limited, retryAfterSeconds } = await isRateLimited(limitKey);
  if (limited) {
    return NextResponse.json(
      { error: `Too many registration attempts. Try again in ${retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  if (!inviteToken && !(await verifyTurnstile(turnstileToken, ip))) {
    await recordFailedAttempt(limitKey);
    return NextResponse.json({ error: "Bot check failed. Please try again." }, { status: 400 });
  }

  if (!inviteToken && (await isVpnOrHostingIp(ip))) {
    await recordFailedAttempt(limitKey);
    return NextResponse.json({ error: "Sign-ups from VPN or hosting IPs are not allowed." }, { status: 403 });
  }

  if (inviteToken) {
    const invite = await getInviteByToken(inviteToken);
    if (!invite || invite.status !== "pending") {
      await recordFailedAttempt(limitKey);
      return NextResponse.json({ error: "Invite is invalid." }, { status: 400 });
    }
    if (!isInviteRole(invite.role)) {
      await recordFailedAttempt(limitKey);
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
      await recordFailedAttempt(limitKey);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const createdUser = await import("@/lib/db").then(({ db }) =>
      db.get<{ id: number; role: string; company: string }>('SELECT "id", "role", "company" FROM "User" WHERE "email" = ?', [email]),
    );
    if (createdUser) {
      if ((invite as { workspaceId?: number | null }).workspaceId) {
        await ensureWorkspaceMembership((invite as { workspaceId?: number | null }).workspaceId as number, createdUser.id, normalizeRole(createdUser.role));
      } else {
        await ensureWorkspaceForUser(createdUser.company, createdUser.id, normalizeRole(createdUser.role));
      }
    }
    const consume = await markInviteAccepted(inviteToken, email);
    if ("error" in consume) {
      return NextResponse.json({ error: consume.error }, { status: 400 });
    }
    sendWelcomeEmail(email, String(invite.company ?? "your workspace"));
    sendInviteAcceptedEmail(invite.createdBy, email, String(invite.company ?? "your workspace"));
    await clearRateLimit(limitKey);
    return NextResponse.json({ ok: true });
  }

  const workspaceName = body?.company?.trim() || `${name || email.split("@")[0]}'s Workspace`;
  const result = await registerUser(email, password, name, "admin", workspaceName);
  if (result.error) {
    await recordFailedAttempt(limitKey);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const createdUser = await import("@/lib/db").then(({ db }) =>
    db.get<{ id: number; role: string; company: string }>('SELECT "id", "role", "company" FROM "User" WHERE "email" = ?', [email]),
  );
  if (createdUser) {
    await ensureWorkspaceForUser(createdUser.company, createdUser.id, normalizeRole(createdUser.role));
  }

  // Public signups need OTP verification to prove there's a real inbox behind the address.
  // Skipped entirely if email sending isn't configured — otherwise dev/local signups would lock themselves out.
  if (createdUser && emailEnabled()) {
    await issueOtp(createdUser.id, email);
    await clearRateLimit(limitKey);
    return NextResponse.json({ ok: true, requiresVerification: true });
  }

  sendWelcomeEmail(email, workspaceName);
  await clearRateLimit(limitKey);
  return NextResponse.json({ ok: true });
}
