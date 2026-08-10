import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// SSE endpoint for real-time admin notifications
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user.role, user.company)) {
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

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ lastId: lastCheckedId })}\n\n`));

      // Poll for new notifications every 5 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

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

          // Send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch {
          // Silently ignore polling errors
        }
      }, 5000);

      // Cleanup on close
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
      };

      // Auto-close after 5 minutes (client will reconnect)
      setTimeout(() => {
        cleanup();
        try { controller.close(); } catch {}
      }, 5 * 60 * 1000);
    },
    cancel() {
      closed = true;
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
