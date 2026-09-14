import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CLEANUP_TABLES = [
  "Task",
  "Bug",
  "TestCase",
  "TestPlan",
  "TestSession",
  "TestSuite",
  "Deployment",
  "MeetingNote",
  "WorkLog",
] as const;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCounts: Record<string, number> = {};

  try {
    for (const table of CLEANUP_TABLES) {
      const rows = await db.query<{ id: number | string }>(
        `DELETE FROM "${table}" WHERE "deletedAt" IS NOT NULL AND "deletedAt" < CURRENT_TIMESTAMP - INTERVAL '90 days' RETURNING "id"`
      );
      deletedCounts[table] = rows.length;
    }

    // Retention pruning: ephemeral presence records older than 1 day
    const staleHeartbeats = await db.query<{ id: number }>(
      `DELETE FROM "PresenceHeartbeat" WHERE "lastSeen" < CURRENT_TIMESTAMP - INTERVAL '1 day' RETURNING "id"`
    );
    deletedCounts["PresenceHeartbeat"] = staleHeartbeats.length;

    const stalePresence = await db.query<{ id: number }>(
      `DELETE FROM "CollaborationPresence" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '1 day' RETURNING "id"`
    );
    deletedCounts["CollaborationPresence"] = stalePresence.length;

    // Retention pruning: activity logs older than 180 days
    const staleActivity = await db.query<{ id: number }>(
      `DELETE FROM "ActivityLog" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '180 days' RETURNING "id"`
    );
    deletedCounts["ActivityLog"] = staleActivity.length;

    // Retention pruning: email events older than 90 days
    const staleEmailEvents = await db.query<{ id: number }>(
      `DELETE FROM "EmailEvent" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days' RETURNING "id"`
    );
    deletedCounts["EmailEvent"] = staleEmailEvents.length;

    return NextResponse.json({
      ok: true,
      cleanedAt: new Date().toISOString(),
      deletedCounts,
    });
  } catch (err) {
    console.error("Cleanup deleted cron error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        deletedCounts,
      },
      { status: 500 }
    );
  }
}
