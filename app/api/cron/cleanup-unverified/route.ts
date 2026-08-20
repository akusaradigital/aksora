import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db.query<{ id: number }>(
      `DELETE FROM "User" WHERE "emailVerified" = 0 AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '24 hours' RETURNING "id"`
    );

    return NextResponse.json({ ok: true, cleanedAt: new Date().toISOString(), deletedCount: rows.length });
  } catch (err) {
    console.error("Cleanup unverified cron error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
