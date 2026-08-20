import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimitKey, isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = body?.email?.trim().toLowerCase() || "";

    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const ip = getClientIp(request);
    const key = rateLimitKey(ip, `forgot-${email}`);
    const { limited, retryAfterSeconds } = await isRateLimited(key);
    if (limited) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const user = await db.get<{ id: number; name: string | null; email: string }>(
      'SELECT "id", "name", "email" FROM "User" WHERE LOWER("email") = ? AND "deletedAt" IS NULL',
      [email],
    );

    // If user doesn't exist, still return success to prevent email enumeration
    if (!user) {
      await recordFailedAttempt(key);
      return NextResponse.json({
        ok: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    // Invalidate existing unused tokens for this user
    await db.run(
      'UPDATE "PasswordResetToken" SET "usedAt" = CURRENT_TIMESTAMP WHERE "userId" = ? AND "usedAt" IS NULL',
      [user.id],
    ).catch(() => {});

    // Generate secure 32-byte hex token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    await db.run(
      'INSERT INTO "PasswordResetToken" ("userId", "token", "expiresAt") VALUES (?, ?, ?)',
      [user.id, token, expiresAt],
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://aksora.akusaraproject.my.id";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl, user.name || undefined);

    return NextResponse.json({
      ok: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process password reset request." }, { status: 500 });
  }
}
