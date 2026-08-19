import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { PLAN_MAX_USERS } from "@/lib/plan-limits";

const PLACEHOLDER = "placeholder_replace_me";

const LEMONSQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1/checkouts";

export type LemonSqueezyPlan = "pro" | "enterprise";

function isPlaceholder(value: string | undefined) {
  return !value || !value.trim() || value.trim() === PLACEHOLDER;
}

export function lemonSqueezyEnabled(): boolean {
  return !isPlaceholder(process.env.LEMONSQUEEZY_API_KEY);
}

function getVariantId(plan: LemonSqueezyPlan): string | null {
  const envKey = plan === "pro" ? "LEMONSQUEEZY_VARIANT_PRO" : "LEMONSQUEEZY_VARIANT_ENTERPRISE";
  const value = process.env[envKey];
  return isPlaceholder(value) ? null : (value as string).trim();
}

export async function createCheckoutUrl(
  companyName: string,
  plan: LemonSqueezyPlan,
): Promise<{ url: string } | { error: string }> {
  if (!lemonSqueezyEnabled()) {
    return { error: "Lemon Squeezy is not configured yet" };
  }

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (isPlaceholder(storeId)) {
    return { error: "Lemon Squeezy is not configured yet" };
  }

  const variantId = getVariantId(plan);
  if (!variantId) {
    return { error: "Lemon Squeezy is not configured yet" };
  }

  try {
    const response = await fetch(LEMONSQUEEZY_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              custom: {
                company: companyName,
              },
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: String(storeId) },
            },
            variant: {
              data: { type: "variants", id: String(variantId) },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { error: `Lemon Squeezy checkout request failed (${response.status}): ${body.slice(0, 300)}` };
    }

    const json = (await response.json()) as {
      data?: { attributes?: { url?: string } };
    };
    const url = json.data?.attributes?.url;
    if (!url) {
      return { error: "Lemon Squeezy did not return a checkout URL." };
    }

    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reach Lemon Squeezy." };
  }
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null | undefined): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (isPlaceholder(secret) || !signatureHeader) return false;

  const expectedDigest = createHmac("sha256", secret as string).update(rawBody, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expectedDigest, "hex");
  const receivedBuffer = Buffer.from(signatureHeader, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export type LemonSqueezyPlanMapping = { plan: LemonSqueezyPlan; maxUsers: number };

export function mapVariantIdToPlan(variantId: string | number | undefined | null): LemonSqueezyPlanMapping | null {
  if (variantId === undefined || variantId === null) return null;
  const value = String(variantId).trim();
  const proVariant = process.env.LEMONSQUEEZY_VARIANT_PRO;
  const enterpriseVariant = process.env.LEMONSQUEEZY_VARIANT_ENTERPRISE;

  if (!isPlaceholder(proVariant) && value === (proVariant as string).trim()) {
    return { plan: "pro", maxUsers: PLAN_MAX_USERS.pro };
  }
  if (!isPlaceholder(enterpriseVariant) && value === (enterpriseVariant as string).trim()) {
    return { plan: "enterprise", maxUsers: PLAN_MAX_USERS.enterprise };
  }
  return null;
}

export async function upgradeCompanyPlan(companyName: string, mapping: LemonSqueezyPlanMapping, planExpiry: string | null) {
  await db.run(
    `UPDATE "Company" SET "plan" = ?, "maxUsers" = ?, "planExpiry" = ?, "status" = 'active', "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`,
    [mapping.plan, mapping.maxUsers, planExpiry, companyName],
  );
}

export async function downgradeCompanyToFree(companyName: string) {
  await db.run(
    `UPDATE "Company" SET "plan" = 'free', "maxUsers" = ?, "planExpiry" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`,
    [PLAN_MAX_USERS.free, companyName],
  );
}
