import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/data-helpers";
import { workspaceScope } from "@/lib/test-environments";
import { DEFAULT_TIMEZONE, nextRunAt, scheduleSchema, type ScheduleRow } from "@/lib/run-schedules";
import { checkScheduleRefs, presetDefaults } from "./schedule-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  if (!scope) return NextResponse.json({ data: [] });

  const rows = await db.query<ScheduleRow & Record<string, unknown>>(
    `SELECT rs.*, s."title" AS "suiteTitle", e."name" AS "environmentName", COALESCE(w."timezone", ?) AS "timezone"
     FROM "RunSchedule" rs
     LEFT JOIN "TestSuite" s ON s."id" = rs."testSuiteId"
     LEFT JOIN "TestEnvironment" e ON e."id" = rs."environmentId" AND e."deletedAt" IS NULL
     LEFT JOIN "Workspace" w ON w."id" = rs."workspaceId"
     WHERE rs."deletedAt" IS NULL${scope.andWhere ? ` AND rs."workspaceId" = ?` : ""}
     ORDER BY rs."createdAt" DESC`,
    [DEFAULT_TIMEZONE, ...scope.params],
  );
  const now = new Date();
  const data = rows.map((r) => ({
    ...r,
    active: Boolean(Number(r.active)),
    weekdaysOnly: Boolean(Number(r.weekdaysOnly)),
    nextRunAt: Number(r.active) ? nextRunAt(r, now, String(r.timezone))?.toISOString() ?? null : null,
  }));
  return NextResponse.json({ data: JSON.parse(JSON.stringify(data)) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = workspaceScope(user);
  if (!scope?.workspaceId) return NextResponse.json({ error: "Select a workspace first" }, { status: 400 });

  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const b = parsed.data;

  const refError = await checkScheduleRefs(scope.workspaceId, b.testSuiteId, b.environmentId ?? null);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const { hour, weekdaysOnly } = presetDefaults(b.preset, b.hour, b.weekdaysOnly);
  const row = await db.get<Record<string, unknown>>(
    `INSERT INTO "RunSchedule" ("workspaceId", "name", "testSuiteId", "environmentId", "preset", "hour", "weekdaysOnly", "active", "createdBy")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    [scope.workspaceId, b.name, b.testSuiteId, b.environmentId ?? null, b.preset, hour, weekdaysOnly ? 1 : 0, b.active === false ? 0 : 1, Number(user.id) || null],
  );
  if (!row) return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });

  await logActivity(scope.company, "RunSchedule", String(row.id), "Created", `Schedule "${b.name}" created`, user.name || user.email || "", undefined, scope.workspaceId);
  return NextResponse.json({ data: JSON.parse(JSON.stringify(row)) }, { status: 201 });
}
