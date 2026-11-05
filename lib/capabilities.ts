import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/roles";

export const CAPABILITY_GROUPS = {
  "Test cases": ["testcases.create", "testcases.edit", "testcases.delete"],
  "Test runs": ["runs.create", "runs.execute", "runs.delete"],
  Bugs: ["bugs.create", "bugs.triage", "bugs.ticket"],
  Reports: ["reports.view", "reports.share", "export.data"],
  Setup: ["environments.manage", "schedules.manage", "integrations.manage", "settings.manage"],
  Members: ["members.invite", "members.manage", "roles.manage"],
  AI: ["ai.generate", "ai.usage.view"],
  Vault: ["vault.use"],
} as const;

export type Capability = (typeof CAPABILITY_GROUPS)[keyof typeof CAPABILITY_GROUPS][number];

export const CAPABILITIES = Object.values(CAPABILITY_GROUPS).flat() as Capability[];

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as string[]).includes(value);
}

const DEV_CAPS: Capability[] = [
  "testcases.create", "testcases.edit", "runs.create", "runs.execute",
  "bugs.create", "bugs.triage", "reports.view", "export.data", "ai.generate", "vault.use",
];

// Built-in presets keyed by lib/roles.ts role ids. Admin gets everything; a role not listed gets read-only.
export const ROLE_PRESETS: Record<string, Capability[]> = {
  admin: CAPABILITIES,
  qa: [
    "testcases.create", "testcases.edit", "testcases.delete", "runs.create", "runs.execute", "runs.delete",
    "bugs.create", "bugs.triage", "bugs.ticket", "reports.view", "reports.share", "environments.manage",
    "schedules.manage", "export.data", "ai.generate", "vault.use",
  ],
  pm: [
    "runs.create", "bugs.create", "bugs.triage", "bugs.ticket", "reports.view", "reports.share",
    "members.invite", "export.data", "ai.generate", "ai.usage.view",
  ],
  fe: DEV_CAPS,
  be: DEV_CAPS,
  fullstack: DEV_CAPS,
  ai: [...DEV_CAPS, "ai.usage.view"],
  guest: ["reports.view"],
};

export const customRoleSchema = z.object({
  name: z.string().trim().min(1).max(60),
  capabilities: z.array(z.enum(CAPABILITIES as [Capability, ...Capability[]])),
  enabled: z.boolean().optional(),
});

export const BUILT_IN_ROLES = Object.keys(ROLE_PRESETS);

/** Pure resolution: superadmin/admin get all; a custom role overrides the preset; unknown roles fall back to guest. */
export function resolveCapabilities(role: string | null | undefined, customCapabilities?: string[] | null): Capability[] {
  const normalized = normalizeRole(role);
  if (normalized === "superadmin" || normalized === "admin") return CAPABILITIES;
  if (customCapabilities) return customCapabilities.filter(isCapability);
  return ROLE_PRESETS[normalized] ?? ROLE_PRESETS.guest;
}

export function parseCapabilities(raw: string | null | undefined): string[] {
  try {
    const value = JSON.parse(String(raw || "[]"));
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

type CapabilityUser = { id: number; role?: string | null; activeWorkspaceId?: number | null } | null | undefined;

export async function getUserCapabilities(user: CapabilityUser): Promise<Capability[]> {
  if (!user) return [];
  const normalized = normalizeRole(user.role);
  if (normalized === "superadmin" || normalized === "admin" || !user.activeWorkspaceId) {
    return resolveCapabilities(user.role);
  }
  const row = await db.get<{ capabilities: string | null }>(
    `SELECT cr."capabilities" FROM "WorkspaceMembership" wm
     INNER JOIN "CustomRole" cr ON cr."id" = wm."customRoleId" AND cr."deletedAt" IS NULL AND cr."enabled" = 1 AND cr."workspaceId" = wm."workspaceId"
     WHERE wm."workspaceId" = CAST(? AS INTEGER) AND wm."userId" = CAST(? AS INTEGER)`,
    [user.activeWorkspaceId, user.id],
  );
  return resolveCapabilities(user.role, row ? parseCapabilities(row.capabilities) : null);
}

export async function hasCapability(user: CapabilityUser, capability: Capability): Promise<boolean> {
  return (await getUserCapabilities(user)).includes(capability);
}

/**
 * Route guard for workspace-scoped settings routes: 401 without session, 400 without an active
 * workspace, 403 when the capability is missing. Pass null to only require a workspace member.
 */
export async function requireWorkspaceCapability(capability: Capability | null) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { NextResponse } = await import("next/server");
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const workspaceId = Number(user.activeWorkspaceId || 0);
  if (!workspaceId) return { error: NextResponse.json({ error: "Select a workspace first." }, { status: 400 }) };
  if (capability && !(await hasCapability(user, capability))) {
    return { error: NextResponse.json({ error: "You do not have permission to do this." }, { status: 403 }) };
  }
  return { user, workspaceId };
}
