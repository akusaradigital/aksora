import { db } from "@/lib/db";
import { notifyChannel, ADMIN_NOTIFY_CHANNEL } from "@/lib/db-notify";

export type AdminNotificationType =
  | "new_ticket"
  | "plan_expired"
  | "plan_expiring"
  | "user_limit_reached"
  | "new_company"
  | "company_suspended"
  | "email_delivery_failed"
  | "email_domain_pending";

export function getAdminNotificationLabel(type: AdminNotificationType) {
  switch (type) {
    case "new_ticket": return "New ticket";
    case "plan_expired": return "Plan expired";
    case "plan_expiring": return "Plan expiring";
    case "user_limit_reached": return "User limit reached";
    case "new_company": return "New company";
    case "company_suspended": return "Company suspended";
    case "email_delivery_failed": return "Email delivery failed";
    case "email_domain_pending": return "Email domain pending verification";
  }
}

/**
 * Create an admin notification that will be pushed via SSE to the superadmin dashboard.
 */
export async function createAdminNotification(params: {
  type: AdminNotificationType;
  title: string;
  message?: string;
  companyId?: number;
  companyName?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.run(
      `INSERT INTO "AdminNotification" ("type", "title", "message", "companyId", "companyName", "meta")
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.type,
        params.title,
        params.message || "",
        params.companyId || null,
        params.companyName || "",
        params.meta ? JSON.stringify(params.meta) : "",
      ]
    );
    void notifyChannel(ADMIN_NOTIFY_CHANNEL, { type: params.type, companyId: params.companyId ?? null });
  } catch (e) {
    console.error("Failed to create admin notification:", e);
  }
}