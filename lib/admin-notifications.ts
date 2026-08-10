import { db } from "@/lib/db";

export type AdminNotificationType =
  | "new_ticket"
  | "plan_expired"
  | "plan_expiring"
  | "user_limit_reached"
  | "new_company"
  | "company_suspended";

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
  } catch (e) {
    console.error("Failed to create admin notification:", e);
  }
}
