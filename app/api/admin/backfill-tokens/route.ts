import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/roles";
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

  if (!isPlatformSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const results: Record<string, number> = {};

    for (const table of TABLES_WITH_PUBLIC_TOKEN) {
      // Backfill rows one at a time so each gets its own CSPRNG token
      // (crypto.randomBytes), not a SQL-side md5(random()) which is both
      // low-entropy and guessable from the row id it's seeded with.
      const emptyRows = await db.query<{ id: number }>(
        `SELECT "id" FROM "${table}" WHERE COALESCE("publicToken", '') = ''`,
      );
      for (const row of emptyRows) {
        const token = randomBytes(16).toString("base64url");
        await db.run(`UPDATE "${table}" SET "publicToken" = ? WHERE "id" = CAST(? AS INTEGER)`, [token, row.id]);
      }
      results[table] = emptyRows.length;
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
