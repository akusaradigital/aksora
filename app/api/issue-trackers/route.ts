import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope, logActivity } from "@/lib/data-helpers";
import { encryptSecret } from "@/lib/vault-crypto";
import { canManageTrackers, toPublicTracker, trackerConfigSchemas, TRACKER_KINDS, type TrackerRow } from "@/lib/issue-trackers";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(TRACKER_KINDS),
  name: z.string().trim().min(1).max(120),
  config: z.record(z.string(), z.unknown()),
  secret: z.string().trim().min(1, "API token is required"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = getAccessScope(user);
  if (!scope.workspaceId) return NextResponse.json({ data: [] });

  const rows = await db.query<TrackerRow>(
    `SELECT "id", "workspaceId", "kind", "name", "config", "enabled", "createdAt", "updatedAt"
     FROM "IssueTracker" WHERE "workspaceId" = ? AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`,
    [scope.workspaceId],
  );
  return NextResponse.json({ data: rows.map(toPublicTracker) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTrackers(user.role, user.company)) {
    return NextResponse.json({ error: "Only admins and PMs can manage issue trackers." }, { status: 403 });
  }
  const scope = getAccessScope(user);
  if (!scope.workspaceId) return NextResponse.json({ error: "Select a workspace first." }, { status: 400 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const cfg = trackerConfigSchemas[parsed.data.kind].safeParse(parsed.data.config);
  if (!cfg.success) {
    const issue = cfg.error.issues[0];
    return NextResponse.json({ error: `Invalid ${issue?.path.join(".") || "config"}: ${issue?.message}` }, { status: 400 });
  }

  const row = await db.get<TrackerRow>(
    `INSERT INTO "IssueTracker" ("workspaceId", "kind", "name", "config", "secretEncrypted", "enabled")
     VALUES (?, ?, ?, ?, ?, 1)
     RETURNING "id", "workspaceId", "kind", "name", "config", "enabled", "createdAt", "updatedAt"`,
    [scope.workspaceId, parsed.data.kind, parsed.data.name, JSON.stringify(cfg.data), encryptSecret(parsed.data.secret)],
  );
  if (!row) return NextResponse.json({ error: "Failed to save tracker." }, { status: 500 });

  await logActivity(scope.company, "IssueTracker", String(row.id), "Created", `Added ${row.kind} tracker "${row.name}"`, user.name, undefined, scope.workspaceId);
  return NextResponse.json({ data: toPublicTracker(row) });
}
