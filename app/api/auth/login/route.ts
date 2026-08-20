import { NextRequest, NextResponse } from "next/server";
import { authEnabled, createSessionToken, validateCredentials, sessionCookieName, createTempMfaToken } from "@/lib/auth";
import { rateLimitKey, isRateLimited, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";

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

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.json({ error: "AUTH_SECRET is not configured. Restart the dev server after setting .env." }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => null) as { email?: string; password?: string; rememberMe?: boolean } | null;
    const email = body?.email?.trim() || "";
    const password = body?.password || "";
    const rememberMe = Boolean(body?.rememberMe);

    // Input validation
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
    }

    // Rate limiting
    const ip = getClientIp(request);
    const key = rateLimitKey(ip, email);
    const { limited, retryAfterSeconds } = await isRateLimited(key);
    if (limited) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    const user = await validateCredentials(email, password);
    if (!user) {
      await recordFailedAttempt(key);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email before signing in.", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    }

    // Success - clear rate limit
    await clearRateLimit(key);

    if (user.mfaEnabled) {
      const tempToken = await createTempMfaToken(user.id);
      return NextResponse.json({
        requiresMfa: true,
        tempToken,
      });
    }

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 6; // 30 days if rememberMe, else 6 hours
    const token = await createSessionToken(email, user, maxAge * 1000);
    const response = NextResponse.json({ ok: true, role: user.role, company: user.company });
    response.cookies.set(sessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Login failed. Check server logs for details." }, { status: 500 });
  }
}
