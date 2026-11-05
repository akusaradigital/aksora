import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { normalizeRole } from "@/lib/roles";
import { createTicket, getTracker, type TicketBug } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  trackerId: z.coerce.number().int().positive(),
  runUrl: z.string().url().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (normalizeRole(user.role) === "guest") return NextResponse.json({ error: "Guests have read-only access." }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a tracker." }, { status: 400 });

  const scope = getAccessScope(user);
  const bugId = Number((await params).id);
  if (!Number.isInteger(bugId)) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  const bug = await db.get<TicketBug & { company: string; workspaceId: number | null; externalTicket?: string }>(
    `SELECT "id", "company", "workspaceId", "publicToken", "title", "project", "module", "severity", "priority", "preconditions",
            "stepsToReproduce", "expectedResult", "actualResult", "externalTicket"
     FROM "Bug" WHERE "id" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
    [bugId, ...scope.params],
  );
  if (!bug) return NextResponse.json({ error: "Bug not found." }, { status: 404 });

  // Tracker belongs to the bug's workspace, not necessarily the caller's (superadmin case).
  const tracker = await getTracker(parsed.data.trackerId, ` AND "workspaceId" = ?`, [bug.workspaceId ?? -1]);
  if (!tracker || !tracker.enabled) return NextResponse.json({ error: "Tracker not found or disabled." }, { status: 404 });

  try {
    const ticket = await createTicket(tracker, bug, { runUrl: parsed.data.runUrl });
    const externalTicket = ticket.url || ticket.key;
    await db.run(`UPDATE "Bug" SET "externalTicket" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [externalTicket, bug.id]);
    await logActivity(
      bug.company,
      "Bug",
      String(bug.id),
      "Ticket created",
      `Created ${tracker.kind} ticket ${ticket.key} via "${tracker.name}"`,
      user.name,
      bug.publicToken,
      bug.workspaceId,
    );
    return NextResponse.json({ data: { ...ticket, externalTicket } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create ticket." }, { status: 502 });
  }
}
