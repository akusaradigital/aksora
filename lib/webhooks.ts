import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { validateOutboundUrl, validateOutboundUrlAsync } from "@/lib/ssrf-guard";

type WebhookRow = {
  id: number;
  url: string;
  secret: string;
  events: string;
  active: number | boolean;
  workspaceId: number | null;
  createdAt: string;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  failureCount: number;
};

// Auto-disable a webhook after this many consecutive delivery failures so a
// dead endpoint doesn't get hammered forever.
const MAX_CONSECUTIVE_FAILURES = 10;
const DELIVERY_TIMEOUT_MS = 8000;

export function generateWebhookSecret() {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function signWebhookPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(secret: string, body: string, signatureHeader: string | null | undefined): boolean {
  if (!secret || !signatureHeader) return false;
  try {
    const expected = signWebhookPayload(secret, body);
    const expectedBuf = Buffer.from(expected, "hex");
    const rawSig = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
    const receivedBuf = Buffer.from(rawSig, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

function normalizeEvents(events?: string[] | null): string {
  if (!events || events.length === 0 || events.includes("*")) return "*";
  return events.map((e) => e.trim()).filter(Boolean).join(",");
}

export async function createWebhookForUser(
  userId: number,
  company: string,
  url: string,
  workspaceId?: number | null,
  events?: string[] | null,
) {
  const trimmedUrl = String(url ?? "").trim();
  const urlError = validateOutboundUrl(trimmedUrl);
  if (urlError) {
    throw new Error(urlError);
  }

  const secret = generateWebhookSecret();
  const eventsString = normalizeEvents(events);

  const created = await db.get<{ id: number }>(
    `INSERT INTO "Webhook" ("userId", "workspaceId", "company", "url", "secret", "events")
     VALUES (?, CAST(? AS INTEGER), ?, ?, ?, ?)
     RETURNING "id"`,
    [userId, workspaceId ?? null, company, trimmedUrl, secret, eventsString],
  );

  if (!created?.id) {
    throw new Error("Failed to create webhook.");
  }

  return { id: Number(created.id), secret };
}

export async function listWebhooksForUser(userId: number) {
  return db.query<WebhookRow>(
    `SELECT "id", "url", "events", "active", "workspaceId", "createdAt", "lastTriggeredAt", "lastStatus", "failureCount"
     FROM "Webhook"
     WHERE "userId" = ?
     ORDER BY "createdAt" DESC`,
    [userId],
  );
}

export async function deleteWebhook(userId: number, id: number) {
  const deleted = await db.get<{ id: number }>(
    `DELETE FROM "Webhook" WHERE "id" = CAST(? AS INTEGER) AND "userId" = CAST(? AS INTEGER) RETURNING "id"`,
    [id, userId],
  );
  return Boolean(deleted?.id);
}

function matchesEvent(subscribed: string, eventType: string): boolean {
  if (subscribed === "*") return true;
  const list = subscribed.split(",").map((e) => e.trim()).filter(Boolean);
  return list.includes(eventType);
}

/**
 * Fire-and-forget outbound webhook dispatch. Called from logActivity() so
 * every module CRUD mutation can push to subscribed external endpoints.
 * eventType is "{entityType}.{action}" lowercased, e.g. "task.created".
 */
export async function dispatchWebhooks(company: string, eventType: string, payload: Record<string, unknown>) {
  try {
    const webhooks = await db.query<WebhookRow>(
      `SELECT "id", "url", "secret", "events", "failureCount" FROM "Webhook" WHERE "company" = ? AND "active" = 1`,
      [company],
    );

    const matching = webhooks.filter((w) => matchesEvent(String(w.events ?? "*"), eventType));
    if (matching.length === 0) return;

    const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });

    await Promise.all(
      matching.map((webhook) => deliverWebhook(webhook, body)),
    );
  } catch (e) {
    console.error("[webhooks] dispatch failed:", e);
  }
}

async function deliverWebhook(webhook: WebhookRow, body: string) {
  // Re-check at delivery time (not just at creation time) so a webhook URL
  // that used to resolve publicly but now points at a private/internal IP
  // (DNS rebinding, or infra that changed after the webhook was saved) can't
  // be used to reach internal services.
  const urlError = await validateOutboundUrlAsync(webhook.url);
  if (urlError) {
    console.error(`[webhooks] refusing to deliver to ${webhook.url}: ${urlError}`);
    return;
  }

  const signature = signWebhookPayload(webhook.secret, body);
  let status = 0;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aksora-Signature": signature,
          "X-Aksora-Signature-256": `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
      });
      status = res.status;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    status = 0;
  }

  const succeeded = status >= 200 && status < 300;
  try {
    if (succeeded) {
      await db.run(
        `UPDATE "Webhook" SET "lastTriggeredAt" = CURRENT_TIMESTAMP, "lastStatus" = ?, "failureCount" = 0 WHERE "id" = CAST(? AS INTEGER)`,
        [status, webhook.id],
      );
    } else {
      const nextFailureCount = Number(webhook.failureCount ?? 0) + 1;
      const shouldDisable = nextFailureCount >= MAX_CONSECUTIVE_FAILURES;
      await db.run(
        `UPDATE "Webhook"
         SET "lastTriggeredAt" = CURRENT_TIMESTAMP, "lastStatus" = ?, "failureCount" = ?, "active" = ?
         WHERE "id" = CAST(? AS INTEGER)`,
        [status, nextFailureCount, shouldDisable ? 0 : 1, webhook.id],
      );
    }
  } catch (e) {
    console.error("[webhooks] failed to record delivery result:", e);
  }
}
