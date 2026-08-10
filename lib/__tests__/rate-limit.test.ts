import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimit, isRateLimited, rateLimitKey, recordFailedAttempt } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("normalizes rate limit keys", () => {
    expect(rateLimitKey("127.0.0.1", " QA@Example.COM ")).toBe("127.0.0.1|qa@example.com");
  });

  it("locks after repeated failures and resets after the window expires", () => {
    const key = rateLimitKey("127.0.0.1", "user@example.com");

    for (let i = 0; i < 4; i += 1) {
      recordFailedAttempt(key);
      expect(isRateLimited(key)).toEqual({ limited: false });
    }

    recordFailedAttempt(key);
    expect(isRateLimited(key)).toEqual({ limited: true, retryAfterSeconds: 900 });

    vi.setSystemTime(new Date("2026-05-18T00:15:01Z"));
    expect(isRateLimited(key)).toEqual({ limited: false });

    recordFailedAttempt(key);
    expect(isRateLimited(key)).toEqual({ limited: false });
  });

  it("clears stored entries", () => {
    const key = rateLimitKey("127.0.0.1", "user@example.com");

    recordFailedAttempt(key);
    clearRateLimit(key);

    expect(isRateLimited(key)).toEqual({ limited: false });
  });
});
