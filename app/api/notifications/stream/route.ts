import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceMembershipsForUser } from "@/lib/workspace-memberships";
import { listenChannel, ACTIVITY_NOTIFY_CHANNEL } from "@/lib/db-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// SSE endpoint for real-time user assignment notifications
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const userName = String(user.name || user.email || "").trim();
  const memberships = await getWorkspaceMembershipsForUser(user.id);
  const workspaceIds = memberships
    .map((item) => item.workspaceId)
    .filter((id): id is number => typeof id === "number" && id > 0);

  if (!userName || workspaceIds.length === 0) {
    return NextResponse.json({ error: "No workspace context" }, { status: 400 });
  }

  let closed = false;
  let unlisten: (() => Promise<void>) | null = null;
  let lastCheckedTime = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`),
      );

      const checkForAssignments = async () => {
        if (closed) return;

        try {
          const now = new Date().toISOString();

          // Check tasks newly assigned or updated to this assignee
          const newTasks = await db.query<{
            id: number;
            title: string;
            publicToken: string | null;
            company: string;
            priority: string;
            updatedAt: string;
          }>(
            `SELECT "id", "title", "publicToken", "company", "priority", "updatedAt"
             FROM "Task"
             WHERE "deletedAt" IS NULL
               AND "assignee" = ?
               AND "workspaceId" = ANY(?::int[])
               AND "updatedAt" > ?
             ORDER BY "updatedAt" DESC
             LIMIT 5`,
            [userName, workspaceIds, lastCheckedTime],
          );

          // Check bugs newly assigned or updated to this assignee
          const newBugs = await db.query<{
            id: number;
            title: string;
            publicToken: string | null;
            company: string;
            severity: string;
            updatedAt: string;
          }>(
            `SELECT "id", "title", "publicToken", "company", "severity", "updatedAt"
             FROM "Bug"
             WHERE "deletedAt" IS NULL
               AND "suggestedDev" = ?
               AND "workspaceId" = ANY(?::int[])
               AND "updatedAt" > ?
             ORDER BY "updatedAt" DESC
             LIMIT 5`,
            [userName, workspaceIds, lastCheckedTime],
          );

          lastCheckedTime = now;

          const events = [
            ...newTasks.map((t) => ({
              type: "task_assigned",
              id: t.id,
              title: t.title,
              priority: t.priority,
              workspace: t.company,
              href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(t.company)}&to=${encodeURIComponent(`/tasks?view=${t.publicToken || t.id}`)}`,
              message: `New task assigned: ${t.title}`,
            })),
            ...newBugs.map((b) => ({
              type: "bug_assigned",
              id: b.id,
              title: b.title,
              priority: b.severity,
              workspace: b.company,
              href: `/api/auth/workspace/redirect?workspaceName=${encodeURIComponent(b.company)}&to=${encodeURIComponent(`/bugs?view=${b.publicToken || b.id}`)}`,
              message: `New bug assigned: ${b.title}`,
            })),
          ];

          for (const event of events) {
            controller.enqueue(
              encoder.encode(`event: assignment\ndata: ${JSON.stringify(event)}\n\n`),
            );
          }
        } catch {
          // Ignore query errors during SSE stream
        }
      };

      // React to Task/Bug NOTIFYs (from logActivity) instead of polling. A
      // notify only tells us *something* changed, so we re-run the same
      // "did anything get (re)assigned to me since lastCheckedTime" check.
      try {
        unlisten = await listenChannel(ACTIVITY_NOTIFY_CHANNEL, (payload) => {
          try {
            const parsed = JSON.parse(payload || "{}");
            if (parsed.entityType === "Task" || parsed.entityType === "Bug") {
              void checkForAssignments();
            }
          } catch {
            // Malformed payload — ignore
          }
        });
      } catch {
        // If LISTEN setup fails, the heartbeat below still keeps the client
        // connected and it will reconnect and retry shortly after.
      }

      // Heartbeat so proxies/load balancers don't kill an idle-looking connection.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // ignore
        }
      }, 30000);

      // Clean up after 5 minutes to avoid hanging lambdas indefinitely
      setTimeout(() => {
        closed = true;
        clearInterval(heartbeat);
        void unlisten?.();
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
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
    },
  });
}
