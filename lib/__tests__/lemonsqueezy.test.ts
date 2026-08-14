import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    get: vi.fn(),
    query: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

const DUMMY_SECRET = "dummy_test_secret_1234567890";
const ORIGINAL_ENV = { ...process.env };

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

describe("lemonsqueezy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    mocks.db.get.mockResolvedValue(undefined);
    mocks.db.query.mockResolvedValue([]);
    mocks.db.run.mockResolvedValue(undefined);
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("lemonSqueezyEnabled", () => {
    it("returns false when the API key is unset", async () => {
      delete process.env.LEMONSQUEEZY_API_KEY;
      const { lemonSqueezyEnabled } = await import("@/lib/lemonsqueezy");
      expect(lemonSqueezyEnabled()).toBe(false);
    });

    it("returns false when the API key is still the placeholder", async () => {
      process.env.LEMONSQUEEZY_API_KEY = "placeholder_replace_me";
      const { lemonSqueezyEnabled } = await import("@/lib/lemonsqueezy");
      expect(lemonSqueezyEnabled()).toBe(false);
    });

    it("returns true when a real-looking API key is set", async () => {
      process.env.LEMONSQUEEZY_API_KEY = "ls_live_abc123";
      const { lemonSqueezyEnabled } = await import("@/lib/lemonsqueezy");
      expect(lemonSqueezyEnabled()).toBe(true);
    });
  });

  describe("createCheckoutUrl", () => {
    it("returns a clear error when Lemon Squeezy is not configured", async () => {
      delete process.env.LEMONSQUEEZY_API_KEY;
      const { createCheckoutUrl } = await import("@/lib/lemonsqueezy");
      const result = await createCheckoutUrl("Acme Inc", "pro");
      expect(result).toEqual({ error: "Lemon Squeezy is not configured yet" });
    });
  });

  describe("verifyWebhookSignature", () => {
    it("accepts a signature computed with the correct secret", async () => {
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = DUMMY_SECRET;
      const { verifyWebhookSignature } = await import("@/lib/lemonsqueezy");

      const payload = JSON.stringify({
        meta: { event_name: "subscription_created", custom_data: { company: "Acme Inc" } },
        data: { attributes: { variant_id: "111", renews_at: "2026-09-15T00:00:00Z" } },
      });
      const signature = signPayload(payload, DUMMY_SECRET);

      expect(verifyWebhookSignature(payload, signature)).toBe(true);
    });

    it("rejects a signature computed with the wrong secret", async () => {
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = DUMMY_SECRET;
      const { verifyWebhookSignature } = await import("@/lib/lemonsqueezy");

      const payload = JSON.stringify({ meta: { event_name: "subscription_created" } });
      const signature = signPayload(payload, "a_completely_different_secret");

      expect(verifyWebhookSignature(payload, signature)).toBe(false);
    });

    it("rejects a signature when the payload has been tampered with", async () => {
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = DUMMY_SECRET;
      const { verifyWebhookSignature } = await import("@/lib/lemonsqueezy");

      const originalPayload = JSON.stringify({ meta: { event_name: "subscription_created" } });
      const signature = signPayload(originalPayload, DUMMY_SECRET);
      const tamperedPayload = JSON.stringify({ meta: { event_name: "subscription_cancelled" } });

      expect(verifyWebhookSignature(tamperedPayload, signature)).toBe(false);
    });

    it("rejects when the webhook secret is still the placeholder", async () => {
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "placeholder_replace_me";
      const { verifyWebhookSignature } = await import("@/lib/lemonsqueezy");

      const payload = JSON.stringify({ meta: { event_name: "subscription_created" } });
      const signature = signPayload(payload, "placeholder_replace_me");

      expect(verifyWebhookSignature(payload, signature)).toBe(false);
    });

    it("rejects when the signature header is missing", async () => {
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = DUMMY_SECRET;
      const { verifyWebhookSignature } = await import("@/lib/lemonsqueezy");

      expect(verifyWebhookSignature("{}", null)).toBe(false);
    });
  });

  describe("mapVariantIdToPlan", () => {
    it("maps the pro variant id to the pro plan with its max users", async () => {
      process.env.LEMONSQUEEZY_VARIANT_PRO = "111";
      process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE = "222";
      const { mapVariantIdToPlan } = await import("@/lib/lemonsqueezy");
      const { PLAN_MAX_USERS } = await import("@/lib/plan-limits");

      expect(mapVariantIdToPlan("111")).toEqual({ plan: "pro", maxUsers: PLAN_MAX_USERS.pro });
    });

    it("maps the enterprise variant id to the enterprise plan with its max users", async () => {
      process.env.LEMONSQUEEZY_VARIANT_PRO = "111";
      process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE = "222";
      const { mapVariantIdToPlan } = await import("@/lib/lemonsqueezy");
      const { PLAN_MAX_USERS } = await import("@/lib/plan-limits");

      expect(mapVariantIdToPlan(222)).toEqual({ plan: "enterprise", maxUsers: PLAN_MAX_USERS.enterprise });
    });

    it("returns null for an unknown variant id", async () => {
      process.env.LEMONSQUEEZY_VARIANT_PRO = "111";
      process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE = "222";
      const { mapVariantIdToPlan } = await import("@/lib/lemonsqueezy");

      expect(mapVariantIdToPlan("999")).toBeNull();
    });
  });
});
