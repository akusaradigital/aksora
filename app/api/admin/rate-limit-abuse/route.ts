import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.query<{ key: string; attempts: number; firstAttempt: string; lockedUntil: string | null }>(
    `SELECT "key", "attempts", "firstAttempt", "lockedUntil" FROM "RateLimitAttempt" WHERE "attempts" >= 3 ORDER BY "attempts" DESC LIMIT 100`
  );
  return NextResponse.json({ data: JSON.parse(JSON.stringify(rows)) });
}
