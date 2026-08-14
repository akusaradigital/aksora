import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapVariantIdToPlan, upgradeCompanyPlan, downgradeCompanyToFree, verifyWebhookSignature } from "@/lib/lemonsqueezy";

export const dynamic = "force-dynamic";

type LemonSqueezyWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: { company?: string };
  };
  data?: {
    id?: string | number;
    attributes?: {
      variant_id?: number | string;
      renews_at?: string | null;
      ends_at?: string | null;
      custom_data?: { company?: string };
    };
  };
};

function getCompanyName(payload: LemonSqueezyWebhookPayload): string {
  return String(
    payload.meta?.custom_data?.company ?? payload.data?.attributes?.custom_data?.company ?? "",
  ).trim();
}

async function createAuditLog(action: string, target: string, detail: string) {
  await db.run(
    `INSERT INTO "AdminAuditLog" ("actor", "action", "target", "detail") VALUES (?, ?, ?, ?)`,
    ["system:lemonsqueezy", action, target, detail],
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LemonSqueezyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "";
  const companyName = getCompanyName(payload);

  if (!companyName) {
    console.warn(`[lemonsqueezy webhook] event "${eventName}" is missing custom_data.company; skipping.`);
    return NextResponse.json({ ok: true });
  }

  if (eventName === "subscription_created" || eventName === "subscription_updated") {
    const variantId = payload.data?.attributes?.variant_id;
    const mapping = mapVariantIdToPlan(variantId);
    if (!mapping) {
      console.warn(`[lemonsqueezy webhook] unrecognized variant_id "${variantId}" for company "${companyName}".`);
      return NextResponse.json({ ok: true });
    }
    const planExpiry = payload.data?.attributes?.renews_at ?? payload.data?.attributes?.ends_at ?? null;
    const existing = await db.get<{ plan: string }>(
      'SELECT "plan" FROM "Company" WHERE "name" = ?',
      [companyName],
    );
    await upgradeCompanyPlan(companyName, mapping, planExpiry);
    if (existing) {
      const subscriptionId = payload.data?.id ? String(payload.data.id) : "unknown";
      await createAuditLog(
        "plan_changed",
        companyName,
        `${existing.plan} -> ${mapping.plan} (subscription: ${subscriptionId})`,
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    const existing = await db.get<{ plan: string }>(
      'SELECT "plan" FROM "Company" WHERE "name" = ?',
      [companyName],
    );
    await downgradeCompanyToFree(companyName);
    if (existing) {
      const subscriptionId = payload.data?.id ? String(payload.data.id) : "unknown";
      await createAuditLog(
        "plan_reverted_free",
        companyName,
        `${existing.plan} -> free (subscription: ${subscriptionId})`,
      );
    }
    return NextResponse.json({ ok: true });
  }

  console.log(`[lemonsqueezy webhook] unhandled event "${eventName}" for company "${companyName}".`);
  return NextResponse.json({ ok: true });
}
