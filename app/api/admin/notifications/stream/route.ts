import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";
import { listenChannel, ADMIN_NOTIFY_CHANNEL } from "@/lib/db-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// SSE endpoint for real-time admin notifications
export async function GET(request: Request) {
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
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let autoCloseTimer: ReturnType<typeof setTimeout> | undefined;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    void unlisten?.();
    try {
      controllerRef?.close();
    } catch {
      // already closed
    }
  };

  if (request.signal.aborted) {
    cleanup();
  } else {
    request.signal.addEventListener("abort", cleanup);
  }

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      // Send initial connection event
      safeEnqueue(`event: connected\ndata: ${JSON.stringify({ lastId: lastCheckedId })}\n\n`);

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
            safeEnqueue(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`);
            lastCheckedId = notif.id;
          }
        } catch {
          // Silently ignore transient query errors
        }
      };

      // React to NOTIFY instead of polling — checkForNew() re-queries by id so
      // we never miss a row even if multiple NOTIFYs land before we catch up.
      try {
        const stop = await listenChannel(ADMIN_NOTIFY_CHANNEL, () => {
          void checkForNew();
        });
        if (closed) {
          // Client disconnected while we were still connecting — release now.
          void stop();
        } else {
          unlisten = stop;
        }
      } catch {
        // If LISTEN setup fails, client reconnects and retries shortly after
      }

      // Heartbeat so proxies/load balancers don't kill an idle-looking connection.
      heartbeat = setInterval(() => {
        safeEnqueue(`:heartbeat\n\n`);
      }, 20000);

      // Auto-close after 5 minutes (client will reconnect)
      autoCloseTimer = setTimeout(() => {
        cleanup();
      }, 5 * 60 * 1000);
    },
    cancel() {
      cleanup();
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
