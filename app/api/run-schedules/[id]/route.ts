import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/data-helpers";
import { workspaceScope } from "@/lib/test-environments";
import { scheduleSchema, type SchedulePreset } from "@/lib/run-schedules";
import { checkScheduleRefs, presetDefaults } from "../schedule-helpers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function loadScoped(id: string, scope: NonNullable<ReturnType<typeof workspaceScope>>) {
  return db.get<Record<string, unknown>>(
    `SELECT * FROM "RunSchedule" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${scope.andWhere}`,
    [id, ...scope.params],
  );
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  const { id } = await params;
  const existing = scope ? await loadScoped(id, scope) : undefined;
  if (!scope || !existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

  const parsed = scheduleSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const b = parsed.data;
  const wsId = (existing.workspaceId as number | null) ?? null;

  const testSuiteId = b.testSuiteId ?? Number(existing.testSuiteId);
  const environmentId = b.environmentId === undefined ? ((existing.environmentId as number | null) ?? null) : b.environmentId;
  if (b.testSuiteId !== undefined || b.environmentId !== undefined) {
    const refError = await checkScheduleRefs(wsId, testSuiteId, environmentId);
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });
  }

  const preset = b.preset ?? (existing.preset as SchedulePreset);
  const { hour, weekdaysOnly } = presetDefaults(
    preset,
    b.hour ?? Number(existing.hour),
    b.weekdaysOnly ?? Boolean(Number(existing.weekdaysOnly)),
  );
  const active = b.active === undefined ? Number(existing.active) : b.active ? 1 : 0;

  const row = await db.get<Record<string, unknown>>(
    `UPDATE "RunSchedule" SET "name" = ?, "testSuiteId" = ?, "environmentId" = ?, "preset" = ?, "hour" = ?, "weekdaysOnly" = ?, "active" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? RETURNING *`,
    [b.name ?? existing.name, testSuiteId, environmentId, preset, hour, weekdaysOnly ? 1 : 0, active, existing.id],
  );
  if (!row) return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });

  await logActivity(scope.company, "RunSchedule", String(row.id), "Updated", `Schedule "${row.name}" updated`, user.name || user.email || "", undefined, wsId);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(row)) });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  const { id } = await params;
  const existing = scope ? await loadScoped(id, scope) : undefined;
  if (!scope || !existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

  await db.run(`UPDATE "RunSchedule" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?`, [existing.id]);
  await logActivity(scope.company, "RunSchedule", String(existing.id), "Deleted", `Schedule "${existing.name}" deleted`, user.name || user.email || "", undefined, (existing.workspaceId as number | null) ?? null);
  return NextResponse.json({ data: { id: existing.id } });
}
