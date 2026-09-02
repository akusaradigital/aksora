import { db } from "@/lib/db";
import { logActivity } from "@/lib/data-helpers";

export interface AutomationRuleRow {
  id: number;
  workspaceId?: number | null;
  company: string;
  name: string;
  module: string;
  triggerField: string;
  triggerValue: string;
  actionType: "assign" | "webhook" | "status";
  actionValue: string;
  active: number;
}

// ponytail: synchronous in-process rule evaluation; upgrade to queue if rule volume increases
export async function evaluateAutomationRules(
  module: string,
  entityId: string | number,
  company: string,
  updatedData: Record<string, unknown>,
  workspaceId?: number | null
) {
  try {
    const rules = await db.query<AutomationRuleRow>(
      `SELECT * FROM "AutomationRule"
       WHERE "active" = 1 AND "module" = ? AND ("company" = ? OR "company" = '')
       ${workspaceId ? `AND ("workspaceId" = ? OR "workspaceId" IS NULL)` : ""}`,
      workspaceId ? [module, company, workspaceId] : [module, company]
    );

    for (const rule of rules) {
      const currentValue = String(updatedData[rule.triggerField] ?? "").trim();
      const expectedValue = String(rule.triggerValue).trim();

      if (currentValue.toLowerCase() === expectedValue.toLowerCase()) {
        if (rule.actionType === "assign" && rule.actionValue) {
          if (module === "tasks") {
            await db.run(
              `UPDATE "Task" SET "assignee" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
              [rule.actionValue, entityId]
            );
            await logActivity(
              company,
              "Task",
              String(entityId),
              "Auto-Assigned",
              `Rule '${rule.name}' auto-assigned to ${rule.actionValue}`,
              "Automation Engine"
            );
          }
        } else if (rule.actionType === "webhook" && rule.actionValue) {
          // Trigger outbound webhook payload
          fetch(rule.actionValue, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "rule_triggered",
              rule: rule.name,
              module,
              entityId,
              data: updatedData,
              timestamp: new Date().toISOString(),
            }),
          }).catch((err) => console.warn(`Automation webhook failed for rule ${rule.name}:`, err));
        }
      }
    }
  } catch (err) {
    console.warn("Automation rule evaluation encountered error:", err);
  }
}
