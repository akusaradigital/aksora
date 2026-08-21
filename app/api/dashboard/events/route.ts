import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { getOnlineMembers } from "@/lib/data";
import { db } from "@/lib/db";
import { listenChannel, ACTIVITY_NOTIFY_CHANNEL } from "@/lib/db-notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const HEARTBEAT_MS = 30_000; // 30 seconds keep-alive
// Presence has no natural "changed" event to LISTEN for (it's lastSeen-based),
// so it stays on a cheap poll. Notifications react to NOTIFY instead (below).
const PRESENCE_POLL_MS = 20_000;
const MAX_MISSED_NOTIFICATIONS = 50;

type SseNotification = {
  id: number;
  type: "assignment" | "critical_bug";
  title: string;
  detail: string;
  href: string;
  createdAt: string;
};

type OnlineMember = {
  userId: number;
  userName: string;
  lastSeen: string;
};

function sseFormat(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function membersSignature(members: OnlineMember[]): string {
  return members
    .map((m) => `${m.userId}:${m.lastSeen}`)
    .sort()
    .join("|");
}

/**
 * Query notifications relevant to the current user from the activity log:
 *  - Bug/Task assignment events that mention the user's name
 *  - Critical bug creation events for projects the user has work in
 *
 * "since" is an ISO timestamp; entries with createdAt > since are returned.
 * Bounded to MAX_MISSED_NOTIFICATIONS to prevent flooding on long disconnects.
 */
async function getNotificationsSince(
  company: string,
  userName: string,
  since: string,
): Promise<SseNotification[]> {
  if (!userName) return [];

  // Activity log entries created after `since` that mention the user (assignment)
  // or are critical bug creations.
  const rows = await db.query<{
    id: number | string;
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
    createdAt: string;
  }>(
    `SELECT "id", "entityType", "entityId", "action", "summary", "createdAt"
     FROM "ActivityLog"
     WHERE "company" = ?
       AND "createdAt" > ?
       AND (
         (LOWER("summary") LIKE ? AND LOWER("summary") LIKE ?)
         OR (LOWER("action") = 'created' AND LOWER("summary") LIKE ?)
       )
     ORDER BY "createdAt" DESC
     LIMIT ?`,
    [
      company,
      since,
      "%assigned%",
      `%${userName.toLowerCase()}%`,
      "%critical%",
      MAX_MISSED_NOTIFICATIONS,
    ],
  );

  return rows.map((row) => {
    const isAssignment = String(row.summary ?? "").toLowerCase().includes("assigned");
    const entityType = String(row.entityType ?? "");
    const href = entityType === "Bug" ? `/bugs?viewId=${row.entityId}` :
      entityType === "Task" ? `/tasks?viewId=${row.entityId}` : "/dashboard";
    return {
      id: Number(row.id),
      type: isAssignment ? "assignment" : "critical_bug",
      title: entityType,
      detail: String(row.summary ?? ""),
      href,
      createdAt: String(row.createdAt ?? ""),
    } satisfies SseNotification;
  });
}

/**
 * GET /api/dashboard/events
 * Server-Sent Events stream - pushes presence and notification updates.
 *
 * Query params:
 *   - since: ISO timestamp; on initial connect, returns missed notifications since then.
 *
 * Authenticates via session cookie; scope by company.
 *
 * Note: This Node.js runtime SSE handler uses simple polling under the hood (20s)
 * rather than database triggers to keep deployment simple. Heartbeat every 30s
 * keeps the connection alive across proxies.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { company } = getAccessScope(user);
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") || new Date(Date.now() - 60_000).toISOString();

  const encoder = new TextEncoder();
  let lastMembersSignature = "";
  let lastNotificationCheck = since;
  let closed = false;
  let unlisten: (() => Promise<void>) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Initial presence snapshot
      try {
        const initial = await getOnlineMembers(company);
        lastMembersSignature = membersSignature(initial);
        safeEnqueue(sseFormat("presence", { members: initial }));
      } catch {
        // graceful - keep stream open
      }

      // Initial missed notifications snapshot
      try {
        const missed = await getNotificationsSince(company, user.name || "", since);
        if (missed.length > 0) {
          safeEnqueue(sseFormat("notification_batch", { notifications: missed }));
          lastNotificationCheck = missed[0].createdAt || lastNotificationCheck;
        }
      } catch {
        // graceful
      }

      // Heartbeat to keep proxies from closing the connection
      const heartbeatTimer = setInterval(() => {
        safeEnqueue(`: heartbeat ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      // Presence has no NOTIFY hook, so it stays on a cheap low-frequency poll.
      const presenceTimer = setInterval(async () => {
        if (closed) return;
        try {
          const members = await getOnlineMembers(company);
          const sig = membersSignature(members);
          if (sig !== lastMembersSignature) {
            lastMembersSignature = sig;
            safeEnqueue(sseFormat("presence", { members }));
          }
        } catch {
          // ignore transient errors; keep stream open
        }
      }, PRESENCE_POLL_MS);

      const checkNotifications = async () => {
        if (closed) return;
        try {
          const fresh = await getNotificationsSince(company, user.name || "", lastNotificationCheck);
          if (fresh.length > 0) {
            for (const n of fresh) safeEnqueue(sseFormat("notification", n));
            lastNotificationCheck = fresh[0].createdAt || lastNotificationCheck;
          }
        } catch {
          // ignore transient errors
        }
      };

      // React to ActivityLog NOTIFYs (from logActivity) instead of polling.
      try {
        unlisten = await listenChannel(ACTIVITY_NOTIFY_CHANNEL, (payload) => {
          try {
            const parsed = JSON.parse(payload || "{}");
            if (parsed.company === company) void checkNotifications();
          } catch {
            // Malformed payload — ignore
          }
        });
      } catch {
        // If LISTEN setup fails, presence polling above still keeps the
        // client connected; it will reconnect and retry LISTEN shortly after.
      }

      // Tear down on client disconnect
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatTimer);
        clearInterval(presenceTimer);
        void unlisten?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      void unlisten?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}

// Keep ESM happy when this runtime is used elsewhere
export const _placeholder = true;
