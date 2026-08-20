import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-core";
import { sendPasswordResetSuccessEmail } from "@/lib/email";
import { rateLimitKey, isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      token?: string;
      password?: string;
      confirmPassword?: string;
    } | null;

    const token = body?.token?.trim() || "";
    const password = body?.password || "";
    const confirmPassword = body?.confirmPassword || "";

    if (!token) {
      return NextResponse.json({ error: "Reset token is missing or invalid." }, { status: 400 });
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const key = rateLimitKey(ip, `reset-${token.slice(0, 8)}`);
    const { limited, retryAfterSeconds } = await isRateLimited(key);
    if (limited) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    // Find valid token
    const record = await db.get<{
      id: number;
      userId: number;
      token: string;
      expiresAt: string;
      usedAt: string | null;
    }>(
      'SELECT "id", "userId", "token", "expiresAt", "usedAt" FROM "PasswordResetToken" WHERE "token" = ?',
      [token],
    );

    if (!record) {
      await recordFailedAttempt(key);
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    if (record.usedAt) {
      return NextResponse.json(
        { error: "This password reset link has already been used." },
        { status: 400 },
      );
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Hash new password and update user
    const hashedPassword = await hashPassword(password);
    await db.run(
      'UPDATE "User" SET "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?',
      [hashedPassword, record.userId],
    );

    // Mark token as used
    await db.run(
      'UPDATE "PasswordResetToken" SET "usedAt" = CURRENT_TIMESTAMP WHERE "id" = ?',
      [record.id],
    );

    // Notify user of successful password reset
    const user = await db.get<{ name: string | null; email: string }>(
      'SELECT "name", "email" FROM "User" WHERE "id" = ?',
      [record.userId],
    );
    if (user?.email) {
      await sendPasswordResetSuccessEmail(user.email, user.name || undefined);
    }

    return NextResponse.json({
      ok: true,
      message: "Your password has been successfully reset. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
