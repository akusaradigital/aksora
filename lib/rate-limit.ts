/**
 * Postgres-backed rate limiter for auth endpoints.
 * Tracks attempts by key (IP + email) with a sliding window.
 */

import { db } from "@/lib/db";

type RateLimitRow = {
  attempts: number | string | null;
  firstAttempt: Date | string | null;
  lockedUntil: Date | string | null;
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

export type RateLimitOptions = {
  maxAttempts?: number;
  windowMs?: number;
  lockoutMs?: number;
};

function getRateLimitOptions(options?: RateLimitOptions) {
  return {
    maxAttempts: options?.maxAttempts ?? MAX_ATTEMPTS,
    windowMs: options?.windowMs ?? WINDOW_MS,
    lockoutMs: options?.lockoutMs ?? LOCKOUT_MS,
  };
}

function cleanupSql(windowMs: number) {
  return `
  WITH cleaned AS (
    DELETE FROM "RateLimitAttempt"
    WHERE ("lockedUntil" IS NOT NULL AND "lockedUntil" < CURRENT_TIMESTAMP)
       OR ("lockedUntil" IS NULL AND "firstAttempt" < CURRENT_TIMESTAMP - (${windowMs} * INTERVAL '1 millisecond'))
  )
`;
}

function toMs(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const parsed = value instanceof Date ? value : new Date(value);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
}

// In-memory sliding window fallback when DB is down or for high-frequency requests
const memoryRateLimitStore = new Map<string, { count: number; expiresAt: number }>();

export function checkMemoryRateLimit(
  key: string,
  limit = 60,
  windowMs = 60 * 1000,
): { limited: boolean; remaining: number; resetAfterMs: number } {
  const now = Date.now();
  const entry = memoryRateLimitStore.get(key);

  if (!entry || now > entry.expiresAt) {
    memoryRateLimitStore.set(key, { count: 1, expiresAt: now + windowMs });
    return { limited: false, remaining: limit - 1, resetAfterMs: windowMs };
  }

  if (entry.count >= limit) {
    return { limited: true, remaining: 0, resetAfterMs: Math.max(0, entry.expiresAt - now) };
  }

  entry.count += 1;
  return { limited: false, remaining: limit - entry.count, resetAfterMs: Math.max(0, entry.expiresAt - now) };
}

export function rateLimitKey(ip: string, email: string): string {
  return `${ip}|${email.toLowerCase().trim()}`;
}

export async function isRateLimited(key: string, options?: RateLimitOptions): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const { windowMs } = getRateLimitOptions(options);
  const rows = await db.query<RateLimitRow>(`${cleanupSql(windowMs)} SELECT "attempts", "firstAttempt", "lockedUntil" FROM "RateLimitAttempt" WHERE "key" = ? LIMIT 1`, [key]);
  const entry = rows[0];
  if (!entry) return { limited: false };

  const now = Date.now();
  const lockedUntilMs = toMs(entry.lockedUntil);
  if (lockedUntilMs > now) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((lockedUntilMs - now) / 1000),
    };
  }

  const firstAttemptMs = toMs(entry.firstAttempt);
  if (firstAttemptMs && now - firstAttemptMs > windowMs) {
    await db.run('DELETE FROM "RateLimitAttempt" WHERE "key" = ?', [key]);
  }

  return { limited: false };
}

export async function recordFailedAttempt(key: string, options?: RateLimitOptions): Promise<void> {
  const { maxAttempts, windowMs, lockoutMs } = getRateLimitOptions(options);
  await db.run(
    `${cleanupSql(windowMs)}
     INSERT INTO "RateLimitAttempt" AS r ("key", "attempts", "firstAttempt", "lockedUntil")
     VALUES (?, 1, CURRENT_TIMESTAMP, NULL)
     ON CONFLICT ("key") DO UPDATE SET
       "attempts" = CASE
         WHEN r."firstAttempt" < CURRENT_TIMESTAMP - (${windowMs} * INTERVAL '1 millisecond') THEN 1
         ELSE r."attempts" + 1
       END,
       "firstAttempt" = CASE
         WHEN r."firstAttempt" < CURRENT_TIMESTAMP - (${windowMs} * INTERVAL '1 millisecond') THEN CURRENT_TIMESTAMP
         ELSE r."firstAttempt"
       END,
       "lockedUntil" = CASE
         WHEN r."firstAttempt" < CURRENT_TIMESTAMP - (${windowMs} * INTERVAL '1 millisecond') THEN NULL
         WHEN r."attempts" + 1 >= ${maxAttempts} THEN CURRENT_TIMESTAMP + (${lockoutMs} * INTERVAL '1 millisecond')
         ELSE r."lockedUntil"
       END`,
    [key],
  );
}

export async function clearRateLimit(key: string): Promise<void> {
  await db.run('DELETE FROM "RateLimitAttempt" WHERE "key" = ?', [key]);
}
