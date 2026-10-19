import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { sendOtpEmail, sendWelcomeEmail, emailEnabled } from "@/lib/email";
import { rateLimitKey, isRateLimited, recordFailedAttempt, clearRateLimit, checkMemoryRateLimit, getClientIp } from "@/lib/rate-limit";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

type OtpUser = { id: number; company: string; emailVerified: number; otpCode: string | null; otpExpiresAt: string | null; otpAttempts: number };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; code?: string; resend?: boolean } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const isResend = Boolean(body?.resend);
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const key = rateLimitKey(ip, `otp:${email}`);
  const { limited, retryAfterSeconds } = await isRateLimited(key);
  if (limited) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const user = await db.get<OtpUser>(
    'SELECT "id", "company", "emailVerified", "otpCode", "otpExpiresAt", "otpAttempts" FROM "User" WHERE "email" = ?',
    [email],
  );

  // An unregistered email and an already-verified email must respond
  // identically (both to a code submission and to a resend request) to a
  // genuine pending account, or probing with just an email address — no
  // credential required — becomes a user-enumeration oracle.
  if (!user || user.emailVerified) {
    if (isResend) {
      return NextResponse.json({ ok: true, sent: true });
    }
    await recordFailedAttempt(key);
    return NextResponse.json({ error: "Invalid or expired code. Request a new one." }, { status: 400 });
  }

  if (isResend) {
    if (checkMemoryRateLimit(`otp:resend:${email}`, 3, 15 * 60 * 1000).limited) {
      return NextResponse.json(
        { error: "Please wait a bit before requesting another code." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    const code = String(randomInt(100000, 1000000));
    await db.run(
      'UPDATE "User" SET "otpCode" = ?, "otpExpiresAt" = ?, "otpAttempts" = 0 WHERE "id" = CAST(? AS INTEGER)',
      [code, new Date(Date.now() + OTP_TTL_MS).toISOString(), user.id],
    );
    if (emailEnabled()) sendOtpEmail(email, code);
    return NextResponse.json({ ok: true, sent: true });
  }

  const code = String(body?.code || "").trim();
  const expired = !user.otpCode || !user.otpExpiresAt || new Date(user.otpExpiresAt).getTime() < Date.now();
  if (expired || user.otpAttempts >= MAX_OTP_ATTEMPTS) {
    await recordFailedAttempt(key);
    return NextResponse.json({ error: "Invalid or expired code. Request a new one." }, { status: 400 });
  }
  if (code !== user.otpCode) {
    await recordFailedAttempt(key);
    await db.run('UPDATE "User" SET "otpAttempts" = "otpAttempts" + 1 WHERE "id" = CAST(? AS INTEGER)', [user.id]);
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  await db.run(
    'UPDATE "User" SET "emailVerified" = 1, "otpCode" = NULL, "otpExpiresAt" = NULL, "otpAttempts" = 0 WHERE "id" = CAST(? AS INTEGER)',
    [user.id],
  );
  await clearRateLimit(key);
  sendWelcomeEmail(email, user.company || "your workspace");
  return NextResponse.json({ ok: true });
}
