import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-core";

const publicPaths = [
  "/login",
  "/register",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/google",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/me",
  "/api/health",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/sw.js",
  "/_next",
  "/opengraph-image",
  "/api/upload",
  "/invite/",
  "/report/",
  "/test-plans/",
  "/test-suites/",
  "/test-cases/detail/",
  "/features",
  "/pricing",
  "/demo",
  "/about",
  "/blog",
  "/contact",
  "/privacy",
  "/security",
];

// Rate limiting for API routes (in-memory, per-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // 120 requests per minute per IP
let lastCleanup = Date.now();

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Cleanup stale entries every 5 minutes
  if (now - lastCleanup > 5 * 60_000) {
    for (const [key, val] of rateLimitStore) {
      if (now > val.resetTime) rateLimitStore.delete(key);
    }
    lastCleanup = now;
  }

  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  record.count++;
  return record.count <= RATE_LIMIT_MAX;
}

function detectLocale(header: string | null): "en" | "id" {
  if (!header) return "en";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("id") ? "id" : "en";
}

function withLocale(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.cookies.get("locale")) {
    response.cookies.set("locale", detectLocale(request.headers.get("accept-language")), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact match for root landing page
  if (pathname === "/") {
    return withLocale(request, NextResponse.next());
  }

  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path))) {
    return pathname.startsWith("/api") ? NextResponse.next() : withLocale(request, NextResponse.next());
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api")) {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  const token =
    request.cookies.get("aksora_token")?.value ||
    request.cookies.get("aksora_session")?.value;
  if (await verifySessionToken(token)) {
    return withLocale(request, NextResponse.next());
  }

  // For API routes, return 401 instead of redirect
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"],
};
