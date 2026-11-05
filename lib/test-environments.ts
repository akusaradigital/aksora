import { z } from "zod";
import { db } from "@/lib/db";
import { getAccessScope, type CurrentUser } from "@/lib/data-helpers";
import { decryptSecret, encryptSecret } from "@/lib/vault-crypto";

export type EnvVariable = { key: string; value: string; secret?: boolean; expiresAt?: string };
export type MaskedEnvVariable = EnvVariable & { hasValue: boolean };

export const envVariableSchema = z.object({
  key: z.string().trim().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Variable keys use letters, digits and underscores only"),
  value: z.string().max(5000).default(""),
  secret: z.boolean().optional(),
  expiresAt: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2}.*)?$/, "expiresAt must be an ISO date").optional(),
});

export const environmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  project: z.string().trim().max(200).default(""),
  baseUrl: z.string().trim().max(2000).default(""),
  variables: z.array(envVariableSchema).max(200).default([]),
  enabled: z.boolean().optional(),
});

/**
 * Workspace scope for tables that only have "workspaceId" (no "company" column).
 * Returns null when a non-superadmin has no active workspace.
 */
export function workspaceScope(user: CurrentUser) {
  const { isAdmin, workspaceId, company } = getAccessScope(user);
  if (isAdmin) return { andWhere: "", params: [] as unknown[], workspaceId, company };
  if (!workspaceId) return null;
  return { andWhere: ' AND "workspaceId" = ?', params: [workspaceId] as unknown[], workspaceId, company };
}

export function parseVariables(raw: unknown): EnvVariable[] {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
    return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v.key === "string") : [];
  } catch {
    return [];
  }
}

/** Replaces {{key}} placeholders; unknown placeholders are left as-is so they show up in run logs. */
export function resolveVariables(text: string, vars: Record<string, string>): string {
  return String(text ?? "").replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

export function isExpired(v: Pick<EnvVariable, "expiresAt">, now = new Date()): boolean {
  if (!v.expiresAt) return false;
  const t = Date.parse(v.expiresAt);
  return Number.isFinite(t) && t <= now.getTime();
}

/** Human-readable problems that should block a run. */
export function findVariableProblems(vars: EnvVariable[], now = new Date()): string[] {
  const problems: string[] = [];
  for (const v of vars) {
    if (isExpired(v, now)) problems.push(`Variable ${v.key} expired on ${v.expiresAt!.slice(0, 10)}`);
    else if (!v.value) problems.push(`Variable ${v.key} is empty`);
  }
  return problems;
}

/** Never send secret values to the client. */
export function maskVariables(vars: EnvVariable[]): MaskedEnvVariable[] {
  return vars.map((v) => ({ ...v, value: v.secret ? "" : v.value, hasValue: Boolean(v.value) }));
}

/**
 * Prepares incoming variables for storage: encrypts secrets, and keeps the stored
 * ciphertext when a secret comes back blank (the client only ever sees it masked).
 */
export function prepareVariablesForStorage(incoming: EnvVariable[], existing: EnvVariable[] = []): EnvVariable[] {
  const byKey = new Map(existing.map((v) => [v.key, v]));
  return incoming.map((v) => {
    const prev = byKey.get(v.key);
    const base = { key: v.key, ...(v.expiresAt ? { expiresAt: v.expiresAt } : {}) };
    if (!v.value && prev?.secret && prev.value) return { ...base, value: prev.value, secret: true };
    if (v.secret) return { ...base, value: v.value ? encryptSecret(v.value) : "", secret: true };
    return { ...base, value: v.value };
  });
}

export function serializeEnvironment(row: Record<string, unknown>) {
  const variables = parseVariables(row.variables);
  return { ...row, enabled: Boolean(Number(row.enabled)), variables: maskVariables(variables) };
}

/**
 * Loads an environment for a run with decrypted variables ({{baseUrl}} included).
 * Throws listing every empty or expired variable so the run fails before it starts.
 */
export async function getEnvironmentForRun(envId: number | string, workspaceId: number | null) {
  const env = await db.get<{ id: number; name: string; baseUrl: string; variables: string; enabled: number }>(
    `SELECT "id", "name", "baseUrl", "variables", "enabled" FROM "TestEnvironment"
     WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL AND "workspaceId" IS NOT DISTINCT FROM ?`,
    [envId, workspaceId],
  );
  if (!env) throw new Error(`Environment ${envId} not found`);
  if (!Number(env.enabled)) throw new Error(`Environment "${env.name}" is disabled`);

  const stored = parseVariables(env.variables);
  const problems = findVariableProblems(stored);
  if (problems.length) throw new Error(`Environment "${env.name}" is not ready: ${problems.join("; ")}`);

  const variables: Record<string, string> = { baseUrl: env.baseUrl };
  for (const v of stored) variables[v.key] = v.secret ? decryptSecret(v.value) : v.value;
  return { id: env.id, name: env.name, baseUrl: env.baseUrl, variables };
}
