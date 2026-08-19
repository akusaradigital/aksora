import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { syncAssigneeFromUser } from "@/lib/user-assignee-sync";
import { ensureWorkspaceForUser } from "@/lib/workspace-memberships";
import {
  WORKSPACE_ROLES,
  INVITE_ROLES,
  normalizeRole,
  isPlatformSuperAdmin,
  isInviteRole,
  getRoleLabel,
  getInviteRoleOptions,
  getPublicRoleOptions,
} from "@/lib/roles";
import { apiUserContext } from "@/lib/auth-context";

const COOKIE_NAME = "aksora_session";

export { WORKSPACE_ROLES, INVITE_ROLES, normalizeRole, isPlatformSuperAdmin, isInviteRole, getRoleLabel, getInviteRoleOptions, getPublicRoleOptions };

function getAuthConfig() {
  const secret = (process.env.AUTH_SECRET || "").trim();
  return { secret };
}

function toBase64UrlBytes(input: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64url");
  }
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64UrlBytes(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized, "base64").toString("utf8");
  }
  return atob(normalized);
}

const PASSWORD_SCHEME = "scrypt";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;

function hashLegacyPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function isLegacyPasswordHash(value: string) {
  return /^[a-f0-9]{64}$/i.test(String(value ?? ""));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${PASSWORD_SCHEME}$${salt}$${derived}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  const normalizedHash = String(storedHash ?? "").trim();
  if (!normalizedHash) return false;

  if (isLegacyPasswordHash(normalizedHash)) {
    return timingSafeEqual(
      Buffer.from(hashLegacyPassword(password), "utf8"),
      Buffer.from(normalizedHash, "utf8"),
    );
  }

  const [scheme, salt, derivedHash] = normalizedHash.split("$");
  if (scheme !== PASSWORD_SCHEME || !salt || !derivedHash) return false;

  const expected = Buffer.from(derivedHash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return typeof Buffer !== "undefined"
    ? Buffer.from(bytes).toString("base64url")
    : btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function authEnabled() {
  const { secret } = getAuthConfig();
  return Boolean(secret);
}

export async function validateCredentials(email: string, password: string) {
  try {
    const { db } = await import("./db");
    const user = await db.get<{ id: number; name: string; email: string; role: string; company: string; password: string; mfaEnabled: number; mfaSecret: string | null; activeWorkspaceId: number | null }>(
      `SELECT u."id", u."name", u."email", u."role", u."company", u."password", u."mfaEnabled", u."mfaSecret", w."id" AS "activeWorkspaceId"
       FROM "User" u
       LEFT JOIN "Workspace" w ON w."name" = u."company"
       WHERE u."email" = ?`,
      [email]
    );
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;

    if (isLegacyPasswordHash(user.password)) {
      const upgradedHash = await hashPassword(password);
      await db.run(
        'UPDATE "User" SET "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
        [upgradedHash, user.id],
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
      mfaEnabled: Boolean(user.mfaEnabled),
      mfaSecret: user.mfaSecret || null,
    };
  } catch (err) {
    console.error("Auth DB error:", err);
    return null;
  }
}

export async function registerUser(email: string, password: string, name?: string, role: string = "qa", company: string = "") {
  try {
    const { db } = await import("./db");
    const hashedPassword = await hashPassword(password);
    await db.run('INSERT INTO "User" ("email", "password", "name", "role", "company") VALUES (?, ?, ?, ?, ?)', [email, hashedPassword, name || email, role, company]);
    const user = await db.get<{ id: number; company: string; name: string | null; email: string | null; role: string | null }>(
      'SELECT "id", "company", "name", "email", "role" FROM "User" WHERE "email" = ?',
      [email],
    );
    if (user) {
      await syncAssigneeFromUser(user);
      await ensureWorkspaceForUser(user.company, user.id, String(user.role || role));
    }
    return { success: true };
  } catch (err: unknown) {
    const error = err as { code?: unknown; message?: unknown } | null;
    if (error?.code === "23505" || String(error?.message ?? "").includes("UNIQUE constraint")) {
      return { error: "Email address is already registered. Please use a different email." };
    }
    return { error: "Registration failed. Please try again later." };
  }
}

export async function createTempMfaToken(userId: number) {
  const { secret } = getAuthConfig();
  if (!secret) throw new Error("AUTH_SECRET is required.");
  
  const payload = toBase64UrlBytes(JSON.stringify({
    userId,
    purpose: "mfa_pending",
    expiresAt: Date.now() + 300000, // 5 minutes
  }));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyTempMfaToken(token: string | undefined | null) {
  const { secret } = getAuthConfig();
  if (!token || !secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if ((await sign(payload, secret)) !== signature) return null;

  try {
    const data = JSON.parse(fromBase64UrlBytes(payload)) as { userId?: number; purpose?: string; expiresAt?: number };
    if (data.purpose !== "mfa_pending" || !data.userId || !data.expiresAt) return null;
    if (Date.now() > data.expiresAt) return null; // Token expired
    return data.userId;
  } catch {
    return null;
  }
}

export async function createSessionToken(
  email: string,
  user?: { id: number; name: string; role: string; company: string; activeWorkspaceId?: number | null }
) {
  const { secret } = getAuthConfig();
  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }
  // Include password hash prefix as version marker for revocation
  let pv = "";
  if (user) {
    try {
      const { db } = await import("./db");
      const row = await db.get<{ password: string }>(
        'SELECT "password" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
        [user.id],
      );
      if (row?.password) {
        pv = row.password.slice(0, 16);
      }
    } catch { /* non-critical */ }
  }
  const payload = toBase64UrlBytes(JSON.stringify({
    email,
    ts: Date.now(),
    ...(pv ? { pv } : {}),
    ...(user ? { id: user.id, name: user.name, role: user.role, company: user.company, activeWorkspaceId: user.activeWorkspaceId ?? null } : {}),
  }));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

const SESSION_DURATION = Number(process.env.SESSION_TTL_HOURS || 6) * 60 * 60 * 1000;

export async function verifySessionToken(token: string | undefined | null) {
  const { secret } = getAuthConfig();
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if ((await sign(payload, secret)) !== signature) return false;
  try {
    const decoded = JSON.parse(fromBase64UrlBytes(payload)) as { email?: string; ts?: number };
    if (decoded.ts && Date.now() - decoded.ts > SESSION_DURATION) return false;
    return Boolean(decoded.email);
  } catch {
    return false;
  }
}

export async function getCurrentUser() {
  const apiUser = apiUserContext.getStore();
  if (apiUser) {
    return { ...apiUser, role: normalizeRole(apiUser.role) };
  }

  let token = "";
  try {
    const { cookies } = await import("next/headers");
    token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  } catch {
    return null;
  }
  if (!token) return null;

  const { secret } = getAuthConfig();
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  // Verify HMAC before trusting payload
  if ((await sign(payload, secret)) !== signature) return null;

  try {
    const decoded = JSON.parse(fromBase64UrlBytes(payload)) as {
      email?: string; ts?: number; pv?: string;
      id?: number; name?: string; role?: string; company?: string; activeWorkspaceId?: number | null;
    };
    if (!decoded.email) return null;
    if (decoded.ts && Date.now() - decoded.ts > SESSION_DURATION) return null;

    // Fast path: user data embedded in token (new tokens after login)
    if (decoded.id && decoded.name !== undefined && decoded.role !== undefined && decoded.company !== undefined) {
      // Verify session hasn't been revoked (password changed)
      if (decoded.pv) {
        const { db } = await import("./db");
        const row = await db.get<{ password: string }>(
          'SELECT "password" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
          [decoded.id],
        );
        if (row?.password && row.password.slice(0, 16) !== decoded.pv) {
          return null; // Password changed - session revoked
        }
      }

      // Resolve activeWorkspaceId from DB if missing in token (old tokens, no re-login needed)
      let activeWorkspaceId = decoded.activeWorkspaceId ?? null;
      if (activeWorkspaceId === null && decoded.company) {
        try {
          const { db } = await import("./db");
          const ws = await db.get<{ id: number }>(
            'SELECT "id" FROM "Workspace" WHERE "name" = ? LIMIT 1',
            [decoded.company],
          );
          activeWorkspaceId = ws?.id ?? null;
        } catch { /* non-critical, stay null */ }
      }

      return {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: normalizeRole(decoded.role),
        company: decoded.company,
        activeWorkspaceId,
      };
    }

    // Fallback: old tokens without embedded user data - hit DB once
    const { db } = await import("./db");
    const user = await db.get<{ id: number; name: string; email: string; role: string; company: string; activeWorkspaceId: number | null }>(
      `SELECT u.id, u.name, u.email, u.role, u.company, w.id AS "activeWorkspaceId"
       FROM "User" u
       LEFT JOIN "Workspace" w ON w.name = u.company
       WHERE u.email = ?`,
      [decoded.email]
    );
    if (!user) return null;
    return { ...user, role: normalizeRole(user.role), activeWorkspaceId: user.activeWorkspaceId ?? null };
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
