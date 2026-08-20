import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/roles";
import { checkMemoryRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const VARIANTS = new Set(["A", "B"]);
const EVENT_TYPES = new Set(["view", "cta_click"]);

// Anonymous, pre-signup event — no auth, memory-only rate limit by IP.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { limited } = checkMemoryRateLimit(`ab-test:${ip}`, 30, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as { variant?: string; eventType?: string } | null;
  const variant = body?.variant || "";
  const eventType = body?.eventType || "";
  if (!VARIANTS.has(variant) || !EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid variant or eventType" }, { status: 400 });
  }

  await db.run('INSERT INTO "AbTestEvent" ("variant", "eventType") VALUES (?, ?)', [variant, eventType]);
  return NextResponse.json({ data: { ok: true } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.query<{ variant: string; eventType: string; count: number }>(
    `SELECT "variant", "eventType", COUNT(*) as "count" FROM "AbTestEvent" GROUP BY "variant", "eventType" ORDER BY "variant", "eventType"`
  );
  return NextResponse.json({ data: JSON.parse(JSON.stringify(rows)) });
}
