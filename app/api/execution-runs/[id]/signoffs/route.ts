import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity, getAccessScope } from "@/lib/data-helpers";

const addSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.union([z.string().trim().email().max(200), z.literal("")]).optional(),
});
const deleteSchema = z.object({ signoffId: z.number().int().positive() });

async function loadRun(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const scope = getAccessScope(user);
  const run = await db.get<{ id: number; runNumber: number; workspaceId: number | null }>(
    `SELECT "id", "runNumber", "workspaceId" FROM "ExecutionRun"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${scope.andWhere}`,
    [id, ...scope.params],
  );
  if (!run) return { error: NextResponse.json({ error: "Run not found" }, { status: 404 }) };
  return { user, scope, run };
}

// GET /api/execution-runs/[id]/signoffs
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await loadRun((await params).id);
  if ("error" in ctx) return ctx.error;
  const rows = await db.query<Record<string, unknown>>(
    `SELECT "id", "name", "email", "decision", "comment", "decidedAt", "createdAt" FROM "RunSignoff"
     WHERE "executionRunId" = ? ORDER BY "id" ASC`,
    [ctx.run.id],
  );
  return NextResponse.json({ data: JSON.parse(JSON.stringify(rows)) });
}

// POST /api/execution-runs/[id]/signoffs - add a stakeholder
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await loadRun((await params).id);
  if ("error" in ctx) return ctx.error;
  const parsed = addSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Name is required and email must be valid" }, { status: 400 });

  const row = await db.get<{ id: number }>(
    `INSERT INTO "RunSignoff" ("workspaceId", "executionRunId", "name", "email") VALUES (?, ?, ?, ?) RETURNING "id"`,
    [ctx.run.workspaceId, ctx.run.id, parsed.data.name, parsed.data.email || ""],
  );
  await logActivity(ctx.scope.company, "ExecutionRun", String(ctx.run.id), "Sign-off requested",
    `Run #${ctx.run.runNumber}: sign-off requested from ${parsed.data.name}`,
    ctx.user.name || ctx.user.email || "", undefined, ctx.scope.workspaceId);
  return NextResponse.json({ data: { id: Number(row?.id) } });
}

// DELETE /api/execution-runs/[id]/signoffs - body { signoffId }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await loadRun((await params).id);
  if ("error" in ctx) return ctx.error;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "signoffId is required" }, { status: 400 });

  const row = await db.get<{ name: string }>(
    `DELETE FROM "RunSignoff" WHERE "id" = ? AND "executionRunId" = ? RETURNING "name"`,
    [parsed.data.signoffId, ctx.run.id],
  );
  if (!row) return NextResponse.json({ error: "Stakeholder not found" }, { status: 404 });
  await logActivity(ctx.scope.company, "ExecutionRun", String(ctx.run.id), "Sign-off removed",
    `Run #${ctx.run.runNumber}: removed stakeholder ${row.name}`,
    ctx.user.name || ctx.user.email || "", undefined, ctx.scope.workspaceId);
  return NextResponse.json({ data: { success: true } });
}
