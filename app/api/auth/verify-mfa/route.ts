import { NextRequest, NextResponse } from "next/server";
import { authEnabled, createSessionToken, sessionCookieName, verifyTempMfaToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyTotpCode } from "@/lib/totp";
import { isRateLimited, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// A TOTP code is only 6 digits (1,000,000 possibilities), so this endpoint
// needs a much tighter lockout than the generic 5-attempts-per-15-minutes
// used by login/register — otherwise it's brute-forceable within the
// tempToken's 5-minute validity window.
const MFA_RATE_LIMIT = { maxAttempts: 5, windowMs: 5 * 60 * 1000, lockoutMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "AUTH_SECRET is not configured." }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => null) as { tempToken?: string; code?: string } | null;
    const tempToken = String(body?.tempToken ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!tempToken || !code) {
      return NextResponse.json({ error: "Temporary token and verification code are required." }, { status: 400 });
    }

    // Keyed by the tempToken itself: it's single-use-scoped to one pending
    // login, stable across attempts (unlike a fresh credential per call),
    // and unguessable, so it's a safe and effective rate-limit key here.
    const rateLimitKey = `mfa-verify|${tempToken}`;
    const { limited, retryAfterSeconds } = await isRateLimited(rateLimitKey, MFA_RATE_LIMIT);
    if (limited) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const userId = await verifyTempMfaToken(tempToken);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired MFA session. Please log in again." }, { status: 401 });
    }

    const user = await db.get<{
      id: number;
      name: string;
      email: string;
      role: string;
      company: string;
      mfaSecret: string | null;
      mfaEnabled: number;
    }>(
      'SELECT "id", "name", "email", "role", "company", "mfaSecret", "mfaEnabled" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
      [userId]
    );

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ error: "MFA is not enabled for this user." }, { status: 400 });
    }

    const isValid = verifyTotpCode(user.mfaSecret, code);
    if (!isValid) {
      await recordFailedAttempt(rateLimitKey, MFA_RATE_LIMIT);
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    await clearRateLimit(rateLimitKey);

    const token = await createSessionToken(user.email, user);
    const response = NextResponse.json({ ok: true, role: user.role, company: user.company });
    response.cookies.set(sessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 6,
    });

    return response;
  } catch (error) {
    console.error("MFA Verify Error:", error);
    return NextResponse.json({ error: "Verification failed. Check server logs for details." }, { status: 500 });
  }
}
