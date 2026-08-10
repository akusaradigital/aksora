import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { upsertHeartbeat, removeStalePresence } from "@/lib/data";
import { db } from "@/lib/db";

type PresenceBody = {
  action: "heartbeat" | "disconnect";
};

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * POST /api/dashboard/presence
 * Body: { action: "heartbeat" | "disconnect" }
 *
 * - heartbeat: upsert lastSeen for the current user
 * - disconnect: remove the current user's presence record
 *
 * Company-scoped via getAccessScope.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  let body: PresenceBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  if (body.action !== "heartbeat" && body.action !== "disconnect") {
    return errorResponse("action must be 'heartbeat' or 'disconnect'", "VALIDATION_ERROR", 400);
  }

  const { company } = getAccessScope(user);

  try {
    if (body.action === "heartbeat") {
      await upsertHeartbeat(company, user.id, user.name || user.email || `User ${user.id}`);
      // Opportunistically prune stale presence rows (cheap, indexed query)
      await removeStalePresence();
    } else {
      // disconnect - remove the user's presence row
      await db.run(`DELETE FROM "PresenceHeartbeat" WHERE "userId" = CAST(? AS INTEGER)`, [user.id]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence endpoint error:", error);
    return errorResponse("Failed to update presence", "INTERNAL_ERROR", 500);
  }
}
