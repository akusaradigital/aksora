import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { encryptSecret } from "@/lib/vault-crypto";
import { canManageTrackers, getTracker, toPublicTracker, trackerConfigSchemas, type TrackerKind, type TrackerRow } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  secret: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
});

async function load(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!canManageTrackers(user.role, user.company)) {
    return { error: NextResponse.json({ error: "Only admins and PMs can manage issue trackers." }, { status: 403 }) };
  }
  const scope = getAccessScope(user);
  const trackerId = Number(id);
  if (!scope.workspaceId || !Number.isInteger(trackerId)) {
    return { error: NextResponse.json({ error: "Tracker not found." }, { status: 404 }) };
  }
  const tracker = await getTracker(trackerId, ` AND "workspaceId" = ?`, [scope.workspaceId]);
  if (!tracker) return { error: NextResponse.json({ error: "Tracker not found." }, { status: 404 }) };
  return { user, scope, tracker };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load((await params).id);
  if ("error" in ctx) return ctx.error;
  const { user, scope, tracker } = ctx;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });

  let configJson = tracker.config;
  if (parsed.data.config) {
    const cfg = trackerConfigSchemas[tracker.kind as TrackerKind]?.safeParse(parsed.data.config);
    if (!cfg?.success) return NextResponse.json({ error: "Invalid tracker config." }, { status: 400 });
    configJson = JSON.stringify(cfg.data);
  }

  const row = await db.get<TrackerRow>(
    `UPDATE "IssueTracker" SET "name" = ?, "config" = ?, "secretEncrypted" = ?, "enabled" = ?, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ? AND "workspaceId" = ?
     RETURNING "id", "workspaceId", "kind", "name", "config", "enabled", "createdAt", "updatedAt"`,
    [
      parsed.data.name ?? tracker.name,
      configJson,
      parsed.data.secret ? encryptSecret(parsed.data.secret) : tracker.secretEncrypted,
      parsed.data.enabled === undefined ? tracker.enabled : parsed.data.enabled ? 1 : 0,
      tracker.id,
      scope.workspaceId,
    ],
  );
  if (!row) return NextResponse.json({ error: "Failed to update tracker." }, { status: 500 });
  await logActivity(scope.company, "IssueTracker", String(row.id), "Updated", `Updated tracker "${row.name}"`, user.name, undefined, scope.workspaceId);
  return NextResponse.json({ data: toPublicTracker(row) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load((await params).id);
  if ("error" in ctx) return ctx.error;
  const { user, scope, tracker } = ctx;
  await db.run(
    `UPDATE "IssueTracker" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ? AND "workspaceId" = ?`,
    [tracker.id, scope.workspaceId],
  );
  await logActivity(scope.company, "IssueTracker", String(tracker.id), "Deleted", `Removed tracker "${tracker.name}"`, user.name, undefined, scope.workspaceId);
  return NextResponse.json({ data: { id: tracker.id } });
}
