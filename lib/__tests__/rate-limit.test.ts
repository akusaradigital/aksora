import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const mocks = vi.hoisted(() => ({
  db: {
    query: vi.fn(),
    run: vi.fn(),
  },
  store: new Map<string, { attempts: number; firstAttempt: number; lockedUntil: number }>(),
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { clearRateLimit, isRateLimited, rateLimitKey, recordFailedAttempt } from "@/lib/rate-limit";

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of mocks.store.entries()) {
    const expiredWindow = now - entry.firstAttempt > WINDOW_MS;
    const expiredLock = entry.lockedUntil > 0 && entry.lockedUntil < now;
    if (expiredWindow || expiredLock) {
      mocks.store.delete(key);
    }
  }
}

function toRow(entry: { attempts: number; firstAttempt: number; lockedUntil: number }) {
  return {
    attempts: entry.attempts,
    firstAttempt: new Date(entry.firstAttempt),
    lockedUntil: entry.lockedUntil > 0 ? new Date(entry.lockedUntil) : null,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-18T00:00:00Z"));
  mocks.store.clear();
  vi.clearAllMocks();

  mocks.db.query.mockImplementation(async (_sql: string, params: unknown[] = []) => {
    cleanupExpiredEntries();
    const key = String(params[0] ?? "");
    const entry = mocks.store.get(key);
    return entry ? [toRow(entry)] : [];
  });

  mocks.db.run.mockImplementation(async (sql: string, params: unknown[] = []) => {
    cleanupExpiredEntries();
    const key = String(params[0] ?? "");

    if (sql.includes('DELETE FROM "RateLimitAttempt" WHERE "key" = ?')) {
      mocks.store.delete(key);
      return;
    }

    if (sql.includes('INSERT INTO "RateLimitAttempt"')) {
      const now = Date.now();
      const existing = mocks.store.get(key);
      if (!existing || now - existing.firstAttempt > WINDOW_MS) {
        mocks.store.set(key, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
        return;
      }

      const attempts = existing.attempts + 1;
      mocks.store.set(key, {
        attempts,
        firstAttempt: existing.firstAttempt,
        lockedUntil: attempts >= 5 ? now + LOCKOUT_MS : existing.lockedUntil,
      });
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rate-limit", () => {
  it("normalizes rate limit keys", () => {
    expect(rateLimitKey("127.0.0.1", " QA@Example.COM ")).toBe("127.0.0.1|qa@example.com");
  });

  it("locks after repeated failures and resets after the window expires", async () => {
    const key = rateLimitKey("127.0.0.1", "user@example.com");

    for (let i = 0; i < 4; i += 1) {
      await recordFailedAttempt(key);
      await expect(isRateLimited(key)).resolves.toEqual({ limited: false });
    }

    await recordFailedAttempt(key);
    await expect(isRateLimited(key)).resolves.toEqual({ limited: true, retryAfterSeconds: 900 });

    vi.setSystemTime(new Date("2026-05-18T00:15:01Z"));
    await expect(isRateLimited(key)).resolves.toEqual({ limited: false });

    await recordFailedAttempt(key);
    await expect(isRateLimited(key)).resolves.toEqual({ limited: false });
  });

  it("clears stored entries", async () => {
    const key = rateLimitKey("127.0.0.1", "user@example.com");

    await recordFailedAttempt(key);
    await clearRateLimit(key);

    await expect(isRateLimited(key)).resolves.toEqual({ limited: false });
  });
});