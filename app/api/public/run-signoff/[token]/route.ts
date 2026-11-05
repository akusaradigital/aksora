import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";
import { checkMemoryRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  signoffId: z.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(2000).optional(),
});

// POST /api/public/run-signoff/[token] - stakeholder approves or rejects a shared run (no login)
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { limited } = checkMemoryRateLimit(`run-signoff:${getClientIp(request)}`, 10, 60 * 1000);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sign-off" }, { status: 400 });

  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  const run = await db.get<{ id: number; runNumber: number; company: string; workspaceId: number | null }>(
    `SELECT "id", "runNumber", "company", "workspaceId" FROM "ExecutionRun"
     WHERE "publicToken" = ? AND "deletedAt" IS NULL`,
    [token],
  );
  if (!run) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const { signoffId, decision, comment } = parsed.data;
  // Only a pending row can be decided; the WHERE makes this race-safe.
  const row = await db.get<{ name: string }>(
    `UPDATE "RunSignoff" SET "decision" = ?, "comment" = ?, "decidedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "executionRunId" = ? AND "decision" = 'pending'
     RETURNING "name"`,
    [decision, comment || "", signoffId, run.id],
  );
  if (!row) return NextResponse.json({ error: "This sign-off was already decided or does not exist" }, { status: 409 });

  await logActivity(run.company, "ExecutionRun", String(run.id), `Sign-off ${decision}`,
    `Run #${run.runNumber}: ${row.name} ${decision} the report`, row.name, undefined, run.workspaceId);
  return NextResponse.json({ data: { success: true } });
}
