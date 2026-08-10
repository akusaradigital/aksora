/**
 * In-memory rate limiter for auth endpoints.
 * Tracks attempts by key (IP + email) with sliding window.
 */

type RateLimitEntry = {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
};

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS && now > entry.lockedUntil) {
      store.delete(key);
    }
  }
}

export function rateLimitKey(ip: string, email: string): string {
  return `${ip}|${email.toLowerCase().trim()}`;
}

export function isRateLimited(key: string): { limited: boolean; retryAfterSeconds?: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) return { limited: false };

  if (entry.lockedUntil > now) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    store.delete(key);
    return { limited: false };
  }

  return { limited: false };
}

export function recordFailedAttempt(key: string): void {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    store.set(key, { attempts: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }

  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  store.set(key, entry);
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
