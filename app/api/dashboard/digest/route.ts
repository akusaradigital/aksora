import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { db } from "@/lib/db";

const MAX_PER_SECTION = 10;
const TIMEOUT_MS = 5_000;

type DigestItem = {
  id: number;
  title: string;
  href: string;
  meta?: string;
};

type DigestPayload = {
  newBugs: DigestItem[];
  assignedItems: DigestItem[];
  statusChanges: DigestItem[];
  upcomingDeadlines: DigestItem[];
  hasData: boolean;
};

function emptyPayload(): DigestPayload {
  return { newBugs: [], assignedItems: [], statusChanges: [], upcomingDeadlines: [], hasData: false };
}

/**
 * Compute the user's last session boundary. We use the start of today as a
 * conservative approximation since session-end tracking is not persisted -
 * everything created or updated since then qualifies as "new since last session".
 */
function lastSessionIso(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadDigest(company: string, userName: string): Promise<DigestPayload> {
  const since = lastSessionIso();
  const andCompany = ` AND "company" = ?`;

  // 1. New bugs since last session (company-scoped)
  const newBugsRows = await db.query<{ id: number | string; title: string; severity: string }>(
    `SELECT "id", "title", "severity"
     FROM "Bug"
     WHERE "createdAt" > ?${andCompany}
     ORDER BY "createdAt" DESC
     LIMIT ?`,
    [since, company, MAX_PER_SECTION],
  );

  // 2. Items assigned to user (Bug.suggestedDev or Task.assignee match user name)
  const [assignedBugs, assignedTasks] = await Promise.all([
    db.query<{ id: number | string; title: string; severity: string }>(
      `SELECT "id", "title", "severity"
       FROM "Bug"
       WHERE "suggestedDev" = ? AND "status" NOT IN ('closed', 'fixed', 'rejected')${andCompany}
       ORDER BY "updatedAt" DESC
       LIMIT ?`,
      [userName, company, MAX_PER_SECTION],
    ),
    db.query<{ id: number | string; title: string; priority: string }>(
      `SELECT "id", "title", "priority"
       FROM "Task"
       WHERE "assignee" = ? AND "status" != 'done'${andCompany}
       ORDER BY "updatedAt" DESC
       LIMIT ?`,
      [userName, company, MAX_PER_SECTION],
    ),
  ]);

  // 3. Status changes since last session on items assigned to or created by user.
  // Approximation: ActivityLog entries on Bug/Task whose summary mentions the user
  // and the action is an update/status change.
  const statusChangeRows = await db.query<{ id: number | string; entityType: string; entityId: string; summary: string; createdAt: string }>(
    `SELECT "id", "entityType", "entityId", "summary", "createdAt"
     FROM "ActivityLog"
     WHERE "createdAt" > ?${andCompany}
       AND LOWER("entityType") IN ('bug', 'task')
       AND (LOWER("summary") LIKE ? OR LOWER("action") = 'updated')
       AND LOWER("summary") LIKE ?
     ORDER BY "createdAt" DESC
     LIMIT ?`,
    [since, company, "%status%", `%${userName.toLowerCase()}%`, MAX_PER_SECTION],
  );

  // 4. Upcoming sprint deadlines within 2 days (company-scoped)
  const twoDaysExpr = `"endDate"::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '2 days')`;

  const upcomingRows = await db.query<{ id: number | string; name: string; endDate: string }>(
    `SELECT "id", "name", "endDate"
     FROM "Sprint"
     WHERE COALESCE("endDate", '') != '' AND ${twoDaysExpr}${andCompany} AND "deletedAt" IS NULL
     ORDER BY "endDate" ASC
     LIMIT ?`,
    [company, MAX_PER_SECTION],
  );

  const newBugs: DigestItem[] = newBugsRows.map((r) => ({
    id: Number(r.id),
    title: String(r.title ?? ""),
    href: `/bugs?viewId=${r.id}`,
    meta: String(r.severity ?? ""),
  }));

  const assignedItems: DigestItem[] = [
    ...assignedBugs.slice(0, MAX_PER_SECTION).map((r) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      href: `/bugs?viewId=${r.id}`,
      meta: `Bug · ${String(r.severity ?? "")}`,
    })),
    ...assignedTasks.slice(0, MAX_PER_SECTION).map((r) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      href: `/tasks?viewId=${r.id}`,
      meta: `Task · ${String(r.priority ?? "")}`,
    })),
  ].slice(0, MAX_PER_SECTION);

  const statusChanges: DigestItem[] = statusChangeRows.map((r) => {
    const entityType = String(r.entityType ?? "");
    return {
      id: Number(r.id),
      title: String(r.summary ?? ""),
      href: entityType === "Bug" ? `/bugs?viewId=${r.entityId}` : `/tasks?viewId=${r.entityId}`,
      meta: String(r.createdAt ?? "").slice(0, 16).replace("T", " "),
    } satisfies DigestItem;
  });

  const upcomingDeadlines: DigestItem[] = upcomingRows.map((r) => ({
    id: Number(r.id),
    title: String(r.name ?? ""),
    href: "/sprints",
    meta: `Ends ${String(r.endDate ?? "")}`,
  }));

  const hasData =
    newBugs.length > 0 ||
    assignedItems.length > 0 ||
    statusChanges.length > 0 ||
    upcomingDeadlines.length > 0;

  return { newBugs, assignedItems, statusChanges, upcomingDeadlines, hasData };
}

/**
 * GET /api/dashboard/digest
 * Returns a morning summary for the authenticated user.
 * Hard 5-second timeout protects against slow queries; on timeout we return an empty payload.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { company } = getAccessScope(user);
  const userName = user.name || "";

  try {
    const payload = await withTimeout(loadDigest(company, userName), TIMEOUT_MS, emptyPayload());
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Digest endpoint error:", error);
    return NextResponse.json(emptyPayload(), { status: 200 });
  }
}
