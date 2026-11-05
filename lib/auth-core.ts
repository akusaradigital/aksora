import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { syncAssigneeFromUser } from "@/lib/user-assignee-sync";
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

const PRIMARY_COOKIE_NAME = "aksora_token";
const FALLBACK_COOKIE_NAME = "aksora_session";
const COOKIE_NAME = PRIMARY_COOKIE_NAME;

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

// Constant-time string comparison for HMAC signatures. A plain `!==` leaks
// timing information proportional to how many leading bytes match, which
// (combined with enough requests) can let an attacker forge a valid
// signature byte-by-byte. Mismatched lengths are rejected before reaching
// timingSafeEqual (which throws on unequal-length buffers) — this itself
// leaks only the length, which carries no information about the secret.
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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

// Shared constant-time check for cron/webhook/admin-tool routes gated by a
// single shared-secret env var compared against an incoming header or body
// field (CRON_SECRET, RESET_SECRET, etc.) — a plain `!==` here leaks timing
// information that lets an attacker recover the secret byte-by-byte.
export function verifySharedSecret(provided: unknown, expected: string | null | undefined): boolean {
  const expectedTrimmed = (expected ?? "").trim();
  if (!expectedTrimmed || typeof provided !== "string" || !provided) return false;
  return constantTimeEqual(provided, expectedTrimmed);
}

export async function validateCredentials(email: string, password: string) {
  try {
    const { db } = await import("./db");
    const { randomUUID } = await import("crypto");
    const user = await db.get<{
      id: number;
      uuid?: string;
      name: string;
      email: string;
      role: string;
      company: string;
      password: string;
      mfaEnabled: number;
      mfaSecret: string | null;
      emailVerified: number;
      activeWorkspaceId: number | null;
      locale?: string;
    }>(
      `SELECT u."id", u."uuid", u."name", u."email", COALESCE(wm."role", u."role") AS "role", u."company", u."password", u."mfaEnabled", u."mfaSecret", u."emailVerified", COALESCE(u."activeWorkspaceId", w."id") AS "activeWorkspaceId", u."locale"
       FROM "User" u
       LEFT JOIN "Workspace" w ON w."name" = u."company"
       LEFT JOIN "WorkspaceMembership" wm ON wm."workspaceId" = COALESCE(u."activeWorkspaceId", w."id") AND wm."userId" = u."id"
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

    // Ensure user has uuid
    let userUuid = user.uuid;
    if (!userUuid) {
      userUuid = randomUUID();
      try {
        await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, user.id]);
        user.uuid = userUuid;
      } catch { /* ignore non-critical */ }
    }

    // Ensure dedicated workspace for user so users don't share workspace 1 / Wahyu's data
    try {
      const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");
      const ws = await ensurePersonalWorkspaceForUser(user.id, user.name, user.email, user.company);
      if (ws) {
        user.activeWorkspaceId = ws.id;
        user.company = ws.name;
      }
    } catch { /* non-critical */ }

    return {
      id: user.id,
      uuid: user.uuid || userUuid,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
      mfaEnabled: Boolean(user.mfaEnabled),
      mfaSecret: user.mfaSecret || null,
      emailVerified: Boolean(user.emailVerified),
      locale: user.locale || "en",
    };
  } catch (err) {
    console.error("Auth DB error:", err);
    return null;
  }
}

export async function registerUser(email: string, password: string, name?: string, role: string = "qa", company: string = "") {
  try {
    const { db } = await import("./db");
    const { randomUUID } = await import("crypto");
    const userUuid = randomUUID();
    const hashedPassword = password ? await hashPassword(password) : "";
    try {
      await db.run(
        'INSERT INTO "User" ("uuid", "email", "password", "name", "role", "company") VALUES (?, ?, ?, ?, ?, ?)',
        [userUuid, email, hashedPassword, name || email, role, company],
      );
    } catch (insertErr: unknown) {
      const errObj = insertErr as { code?: unknown; message?: unknown } | null;
      if (errObj?.code === "23505" || String(errObj?.message ?? "").includes("UNIQUE constraint")) {
        throw insertErr;
      }
      // If column uuid does not exist yet (in older test mocks), fallback to 5-param insert
      await db.run(
        'INSERT INTO "User" ("email", "password", "name", "role", "company") VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, name || email, role, company],
      );
    }

    const user = await db.get<{ id: number; uuid?: string; company: string; name: string | null; email: string | null; role: string | null }>(
      'SELECT "id", "uuid", "company", "name", "email", "role" FROM "User" WHERE "email" = ?',
      [email],
    );
    if (user) {
      if (!user.uuid) {
        try {
          await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, user.id]);
          user.uuid = userUuid;
        } catch { /* ignore non-critical */ }
      }
      try {
        const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");
        const ws = await ensurePersonalWorkspaceForUser(user.id, user.name, user.email, company || user.company);
        if (ws) {
          user.company = ws.name;
        }
      } catch { /* non-critical */ }
      await syncAssigneeFromUser(user);
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
  if (!constantTimeEqual(await sign(payload, secret), signature)) return null;

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
  user?: { id: number; uuid?: string; name: string; role: string; company: string; activeWorkspaceId?: number | null; locale?: string },
  ttlMs?: number,
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
    ...(ttlMs ? { ttl: ttlMs } : {}),
    ...(pv ? { pv } : {}),
    ...(user ? {
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
      locale: user.locale || "en",
    } : {}),
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
  if (!constantTimeEqual(await sign(payload, secret), signature)) return false;
  try {
    const decoded = JSON.parse(fromBase64UrlBytes(payload)) as { email?: string; ts?: number; ttl?: number };
    const maxAge = decoded.ttl || SESSION_DURATION;
    if (decoded.ts && Date.now() - decoded.ts > maxAge) return false;
    return Boolean(decoded.email);
  } catch {
    return false;
  }
}

export async function getCurrentUser() {
  const apiUser = apiUserContext.getStore();
  if (apiUser) {
    return {
      ...apiUser,
      role: normalizeRole(apiUser.role),
      activeWorkspaceId: apiUser.workspaceId ?? null,
    };
  }

  let token = "";
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    token =
      cookieStore.get(PRIMARY_COOKIE_NAME)?.value ||
      cookieStore.get(FALLBACK_COOKIE_NAME)?.value ||
      "";
  } catch {
    return null;
  }
  if (!token) return null;

  const { secret } = getAuthConfig();
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  // Verify HMAC before trusting payload
  if (!constantTimeEqual(await sign(payload, secret), signature)) return null;

  try {
    const decoded = JSON.parse(fromBase64UrlBytes(payload)) as {
      email?: string; ts?: number; pv?: string;
      id?: number; uuid?: string; name?: string; role?: string; company?: string; activeWorkspaceId?: number | null; locale?: string;
    };
    if (!decoded.email) return null;
    if (decoded.ts && Date.now() - decoded.ts > SESSION_DURATION) return null;

    // Fast path: user data embedded in token (new tokens after login)
    if (decoded.id && decoded.name !== undefined && decoded.role !== undefined && decoded.company !== undefined) {
      let validUserId = decoded.id;
      let userDbRow: { id: number; uuid?: string; password: string; company?: string; role?: string; workspaceId?: number | null; activeWorkspaceId?: number | null } | undefined;
      // Verify session hasn't been revoked and user exists in current DB
      try {
        const { db } = await import("./db");
        userDbRow = await db.get<{ id: number; uuid?: string; password: string; company?: string; role?: string; workspaceId?: number | null; activeWorkspaceId?: number | null }>(
          'SELECT "id", "uuid", "password", "company", "role", "workspaceId", "activeWorkspaceId" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
          [decoded.id],
        );
        if (userDbRow) {
          if (decoded.pv && userDbRow.password && userDbRow.password.slice(0, 16) !== decoded.pv) {
            return null; // Password changed - session revoked
          }
        } else if (decoded.email) {
          // User id not found in DB (e.g. after DB reset/reseed) - look up by email
          const byEmail = await db.get<{ id: number; uuid?: string; password: string }>(
            'SELECT "id", "uuid", "password" FROM "User" WHERE "email" = ?',
            [decoded.email],
          );
          if (byEmail?.id) {
            validUserId = byEmail.id;
          } else {
            // User exists in cryptographically verified token but missing in DB.
            // Re-create user record so foreign key constraints on userId never fail.
            try {
              const { randomUUID } = await import("crypto");
              const genUuid = decoded.uuid || randomUUID();
              const inserted = await db.get<{ id: number }>(
                `INSERT INTO "User" ("uuid", "name", "email", "password", "role", "company")
                 VALUES (?, ?, ?, 'session-restored', ?, ?)
                 ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name"
                 RETURNING "id"`,
                [genUuid, decoded.name || decoded.email, decoded.email, decoded.role || "admin", decoded.company || ""]
              );
              if (inserted?.id) {
                validUserId = inserted.id;
              }
            } catch {
              /* ignore non-critical insert error */
            }
          }
        }
      } catch {
        /* non-critical fallback */
      }

      let userUuid = userDbRow?.uuid || decoded.uuid || "";
      if (!userUuid && validUserId) {
        try {
          const { randomUUID } = await import("crypto");
          userUuid = randomUUID();
          const { db } = await import("./db");
          await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, validUserId]);
        } catch { /* non-critical */ }
      }

      // Resolve company and activeWorkspaceId from DB if missing or outdated in token
      let effectiveCompany = userDbRow?.company || decoded.company || "";
      let activeWorkspaceId = decoded.activeWorkspaceId ?? userDbRow?.activeWorkspaceId ?? userDbRow?.workspaceId ?? null;
      if (activeWorkspaceId === null && effectiveCompany && effectiveCompany !== "Akusara Project") {
        try {
          const { db } = await import("./db");
          const ws = await db.get<{ id: number }>(
            'SELECT "id" FROM "Workspace" WHERE "name" = ? LIMIT 1',
            [effectiveCompany],
          );
          activeWorkspaceId = ws?.id ?? null;
        } catch { /* non-critical, stay null */ }
      }
      if (activeWorkspaceId === null) {
        try {
          const { db } = await import("./db");
          const mem = await db.get<{ workspaceId: number; name: string }>(
            `SELECT wm."workspaceId", w."name"
             FROM "WorkspaceMembership" wm
             INNER JOIN "Workspace" w ON w."id" = wm."workspaceId"
             WHERE wm."userId" = CAST(? AS INTEGER)
             ORDER BY (CASE WHEN w."id" = 1 THEN 1 ELSE 0 END) ASC, wm."id" ASC LIMIT 1`,
            [validUserId],
          );
          if (mem?.workspaceId) {
            activeWorkspaceId = mem.workspaceId;
            effectiveCompany = mem.name;
          }
        } catch { /* non-critical */ }
      }
      if (!activeWorkspaceId) {
        try {
          const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");
          const personalWs = await ensurePersonalWorkspaceForUser(validUserId, decoded.name, decoded.email, effectiveCompany);
          if (personalWs) {
            activeWorkspaceId = personalWs.id;
            effectiveCompany = personalWs.name;
          }
        } catch { /* non-critical */ }
      }
      const { isOwnerUser } = await import("./workspace-memberships");
      if (!activeWorkspaceId && (isOwnerUser(decoded.email) || validUserId === 9)) {
        activeWorkspaceId = 1;
      }
      if (!effectiveCompany && (isOwnerUser(decoded.email) || validUserId === 9)) {
        effectiveCompany = "Akusara Project";
      }

      return {
        id: validUserId,
        uuid: userUuid,
        name: decoded.name,
        email: decoded.email,
        role: normalizeRole(userDbRow?.role || decoded.role),
        company: effectiveCompany,
        activeWorkspaceId,
        locale: decoded.locale || "en",
      };
    }

    // Fallback: old tokens without embedded user data - hit DB once
    const { db } = await import("./db");
    const user = await db.get<{ id: number; uuid?: string; name: string; email: string; role: string; company: string; activeWorkspaceId: number | null; locale?: string }>(
      `SELECT u.id, u.uuid, u.name, u.email, COALESCE(wm.role, u.role) AS "role", u.company, COALESCE(u."activeWorkspaceId", w.id) AS "activeWorkspaceId", u.locale
       FROM "User" u
       LEFT JOIN "Workspace" w ON w.name = u.company
       LEFT JOIN "WorkspaceMembership" wm ON wm."workspaceId" = COALESCE(u."activeWorkspaceId", w."id") AND wm."userId" = u."id"
       WHERE u.email = ?`,
      [decoded.email]
    );
    if (!user) return null;
    let fallbackActiveWs = user.activeWorkspaceId;
    let fallbackCompany = user.company;
    if (!fallbackActiveWs) {
      try {
        const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");
        const ws = await ensurePersonalWorkspaceForUser(user.id, user.name, user.email, user.company);
        if (ws) {
          fallbackActiveWs = ws.id;
          fallbackCompany = ws.name;
        }
      } catch {}
    }
    const { isOwnerUser } = await import("./workspace-memberships");
    if (!fallbackActiveWs && isOwnerUser(user.email)) fallbackActiveWs = 1;
    if (!fallbackCompany && isOwnerUser(user.email)) fallbackCompany = "Akusara Project";

    return {
      ...user,
      uuid: user.uuid || "",
      role: normalizeRole(user.role),
      company: fallbackCompany || "Personal Workspace",
      activeWorkspaceId: fallbackActiveWs ?? null,
      locale: user.locale || "en",
    };
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
