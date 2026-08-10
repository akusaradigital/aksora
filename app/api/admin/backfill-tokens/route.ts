import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const TABLES_WITH_PUBLIC_TOKEN = [
  "Task",
  "Bug",
  "TestCase",
  "TestPlan",
  "TestSession",
  "TestSuite",
  "MeetingNote",
  "Sprint",
  "Deployment",
  "WorkLog",
] as const;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const results: Record<string, number> = {};

    for (const table of TABLES_WITH_PUBLIC_TOKEN) {
      const rows = await db.query<{ count: number }>(
        `WITH updated AS (
          UPDATE "${table}"
          SET "publicToken" = md5(random()::text || id::text)
          WHERE COALESCE("publicToken", '') = ''
          RETURNING 1
        )
        SELECT COUNT(*)::int AS "count" FROM updated`
      );
      results[table] = rows[0]?.count ?? 0;
    }

    return NextResponse.json({
      data: results,
      message: "Backfill complete",
    });
  } catch (error) {
    console.error("Backfill tokens error:", error);
    return NextResponse.json(
      { error: "Failed to backfill tokens" },
      { status: 500 }
    );
  }
}
