import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { logger } from "@/lib/logger";

export interface ActivityEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  actor?: string;
  publicToken?: string;
  createdAt: string;
}

export interface CollapsedGroup {
  count: number;
  action: string;
  entityType: string;
  actor: string;
  entries: ActivityEntry[];
  startTime: string;
  endTime: string;
}

/**
 * Extract actor name from the activity entry.
 * Prefers the dedicated actor field, falls back to parsing summary.
 */
export function extractActor(summary: string, actor?: string): string {
  if (actor && actor.trim()) return actor.trim();
  const byMatch = summary.match(/\bby\s+(.+)$/i);
  if (byMatch) return byMatch[1].trim();
  return "";
}

/**
 * Collapsing algorithm: group consecutive entries with same (action, entityType, actor)
 * where timestamps are within a 5-minute window. Only groups with 3+ entries are collapsed.
 */
export function collapseActivityEntries(entries: ActivityEntry[]): {
  entries: ActivityEntry[];
  collapsed: CollapsedGroup[];
} {
  if (entries.length === 0) {
    return { entries: [], collapsed: [] };
  }

  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const collapsed: CollapsedGroup[] = [];
  const remainingEntries: ActivityEntry[] = [];

  let i = 0;
  while (i < entries.length) {
    const current = entries[i];
    const currentActor = extractActor(current.summary, current.actor);
    const currentKey = `${current.action}|${current.entityType}|${currentActor}`;
    const currentTime = new Date(current.createdAt).getTime();

    // Collect all consecutive entries with same key within 5-minute window
    const group: ActivityEntry[] = [current];
    let j = i + 1;

    while (j < entries.length) {
      const next = entries[j];
      const nextActor = extractActor(next.summary, next.actor);
      const nextKey = `${next.action}|${next.entityType}|${nextActor}`;

      if (nextKey !== currentKey) break;

      const nextTime = new Date(next.createdAt).getTime();
      // Check if within 5-minute window from the first entry in the group
      if (Math.abs(currentTime - nextTime) > FIVE_MINUTES_MS) break;

      group.push(next);
      j++;
    }

    if (group.length >= 3) {
      // Collapse this group
      const timestamps = group.map((e) => new Date(e.createdAt).getTime());
      collapsed.push({
        count: group.length,
        action: current.action,
        entityType: current.entityType,
        actor: currentActor,
        entries: group,
        startTime: new Date(Math.min(...timestamps)).toISOString(),
        endTime: new Date(Math.max(...timestamps)).toISOString(),
      });
    } else {
      // Keep entries as individual items
      remainingEntries.push(...group);
    }

    i = j;
  }

  return { entries: remainingEntries, collapsed };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "my" ? "my" : "team";
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200);

  const { company, isAdmin } = getAccessScope(user);

  try {
    let entries: ActivityEntry[];

    if (scope === "my") {
      const userName = (user.name || "").trim();
      const userEmail = (user.email || "").trim();
      const andCompany = isAdmin ? "" : ` AND "company" = ?`;
      const cp = isAdmin ? [] : [company];

      // Build LIKE conditions
      const likeConditions: string[] = [];
      const likeParams: unknown[] = [];
      if (userName) {
        likeConditions.push(`("summary" LIKE ? OR "actor" LIKE ?)`);
        likeParams.push(`%${userName}%`, `%${userName}%`);
      }
      if (userEmail && userEmail !== userName) {
        likeConditions.push(`("summary" LIKE ? OR "actor" LIKE ?)`);
        likeParams.push(`%${userEmail}%`, `%${userEmail}%`);
      }

      if (likeConditions.length > 0) {
        const matched = await db.query<ActivityEntry>(
          `SELECT "id", "entityType", "entityId", "action", "summary", "actor", "publicToken", "createdAt"
           FROM "ActivityLog"
           WHERE (${likeConditions.join(" OR ")})${andCompany}
           ORDER BY "createdAt" DESC
           LIMIT ?`,
          [...likeParams, ...cp, limit],
        );

        entries = matched.length > 0 ? matched : await db.query<ActivityEntry>(
          `SELECT "id", "entityType", "entityId", "action", "summary", "actor", "publicToken", "createdAt"
           FROM "ActivityLog"
           ${isAdmin ? "" : 'WHERE "company" = ?'}
           ORDER BY "createdAt" DESC
           LIMIT ?`,
          [...cp, limit],
        );
      } else {
        entries = await db.query<ActivityEntry>(
          `SELECT "id", "entityType", "entityId", "action", "summary", "actor", "publicToken", "createdAt"
           FROM "ActivityLog"
           ${isAdmin ? "" : 'WHERE "company" = ?'}
           ORDER BY "createdAt" DESC
           LIMIT ?`,
          [...cp, limit],
        );
      }
    } else {
      // Team scope: filter by company
      const andCompany = isAdmin ? "" : ` WHERE "company" = ?`;
      const cp = isAdmin ? [] : [company];

      entries = await db.query<ActivityEntry>(
        `SELECT "id", "entityType", "entityId", "action", "summary", "actor", "publicToken", "createdAt"
         FROM "ActivityLog"${andCompany}
         ORDER BY "createdAt" DESC
         LIMIT ?`,
        [...cp, limit],
      );
    }

    const result = collapseActivityEntries(entries);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
    });
  } catch (error) {
    logger.apiError("/api/dashboard/activity", error);
    return NextResponse.json(
      { entries: [], collapsed: [] },
      { status: 200, headers: { "X-Activity-Error": "true" } },
    );
  }
}
