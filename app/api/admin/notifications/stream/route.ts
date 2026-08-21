import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { listenChannel, ADMIN_NOTIFY_CHANNEL } from "@/lib/db-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// SSE endpoint for real-time admin notifications
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isPlatformSuperAdmin(user.role, user.company)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastCheckedId = 0;
  let closed = false;

  // Get the latest notification ID as baseline
  const latest = await db.get<{ id: number }>(
    `SELECT MAX("id") as "id" FROM "AdminNotification"`
  );
  lastCheckedId = Number(latest?.id || 0);

  let unlisten: (() => Promise<void>) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ lastId: lastCheckedId })}\n\n`));

      const checkForNew = async () => {
        if (closed) return;
        try {
          const newNotifications = await db.query<{
            id: number;
            type: string;
            title: string;
            message: string;
            companyId: number | null;
            companyName: string;
            meta: string;
            createdAt: string;
          }>(
            `SELECT "id", "type", "title", "message", "companyId", "companyName", "meta", "createdAt"
            FROM "AdminNotification"
            WHERE "id" > CAST(? AS INTEGER)
            ORDER BY "id" ASC`,
            [lastCheckedId]
          );

          for (const notif of newNotifications) {
            controller.enqueue(
              encoder.encode(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`)
            );
            lastCheckedId = notif.id;
          }
        } catch {
          // Silently ignore transient query errors
        }
      };

      // React to NOTIFY instead of polling — checkForNew() re-queries by id so
      // we never miss a row even if multiple NOTIFYs land before we catch up.
      try {
        unlisten = await listenChannel(ADMIN_NOTIFY_CHANNEL, () => {
          void checkForNew();
        });
      } catch {
        // If LISTEN setup fails, the heartbeat below still keeps the client
        // connected and it will reconnect and retry shortly after.
      }

      // Heartbeat so proxies/load balancers don't kill an idle-looking connection.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch {
          // ignore
        }
      }, 20000);

      // Cleanup on close
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void unlisten?.();
      };

      // Auto-close after 5 minutes (client will reconnect)
      setTimeout(() => {
        cleanup();
        try { controller.close(); } catch {}
      }, 5 * 60 * 1000);
    },
    cancel() {
      closed = true;
      void unlisten?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
