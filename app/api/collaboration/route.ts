import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Collaboration presence API - tracks who is viewing/editing which items.
 *
 * POST: Register presence on a module item (heartbeat)
 * GET: Get active editors for a module item
 * DELETE: Remove presence (user left the item)
 */

const PRESENCE_TTL_MS = 90_000; // 90 seconds - stale after this

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { module, itemId, action = "viewing" } = body as {
      module?: string;
      itemId?: string | number;
      action?: "viewing" | "editing" | "leave";
    };

    if (!module || !itemId) {
      return NextResponse.json({ error: "module and itemId are required" }, { status: 400 });
    }

    const userId = user.id;
    const userName = user.name || user.email;
    const now = new Date().toISOString();

    if (action === "leave") {
      await db.run(
        'DELETE FROM "CollaborationPresence" WHERE "userId" = CAST(? AS INTEGER) AND "module" = ? AND "itemId" = ?',
        [userId, module, String(itemId)]
      );
      return NextResponse.json({ ok: true });
    }

    // Upsert presence using ON CONFLICT to handle race conditions
    await db.run(
      `INSERT INTO "CollaborationPresence" ("userId", "userName", "module", "itemId", "action", "company", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT ("userId", "module", "itemId") DO UPDATE SET "action" = EXCLUDED."action", "updatedAt" = EXCLUDED."updatedAt"`,
      [userId, userName, module, String(itemId), action, user.company, now]
    );

    // Clean up stale entries
    const staleThreshold = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();
    await db.run(
      'DELETE FROM "CollaborationPresence" WHERE "updatedAt" < ?',
      [staleThreshold]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collaboration presence error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moduleKey = searchParams.get("module");
  const itemId = searchParams.get("itemId");

  if (!moduleKey) {
    return NextResponse.json({ error: "module is required" }, { status: 400 });
  }

  try {
    const staleThreshold = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();

    // Clean stale entries first
    await db.run(
      'DELETE FROM "CollaborationPresence" WHERE "updatedAt" < ?',
      [staleThreshold]
    );

    let editors: Array<{ userId: number; userName: string; module: string; itemId: string; action: string; updatedAt: string }>;

    if (itemId) {
      // Get editors for a specific item
      editors = await db.query(
        'SELECT "userId", "userName", "module", "itemId", "action", "updatedAt" FROM "CollaborationPresence" WHERE "module" = ? AND "itemId" = ? AND "company" = ? AND "userId" != CAST(? AS INTEGER)',
        [moduleKey, itemId, user.company, user.id]
      );
    } else {
      // Get all active editors in a module (for showing indicators on list view)
      editors = await db.query(
        'SELECT "userId", "userName", "module", "itemId", "action", "updatedAt" FROM "CollaborationPresence" WHERE "module" = ? AND "company" = ? AND "userId" != CAST(? AS INTEGER)',
        [moduleKey, user.company, user.id]
      );
    }

    return NextResponse.json({ editors });
  } catch (error) {
    console.error("Collaboration GET error:", error);
    return NextResponse.json({ editors: [] });
  }
}

export async function DELETE(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Remove all presence entries for this user
    await db.run(
      'DELETE FROM "CollaborationPresence" WHERE "userId" = CAST(? AS INTEGER)',
      [user.id]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Collaboration DELETE error:", error);
    return NextResponse.json({ error: "Failed to clear presence" }, { status: 500 });
  }
}
