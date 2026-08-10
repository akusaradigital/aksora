"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTableName, logActivity } from "@/lib/data-helpers";
import type { ModuleKey } from "@/lib/modules";

const ALLOWED_FIELDS = [
  "status",
  "priority",
  "severity",
  "assignee",
  "sprint",
  "environment",
  "suggestedDev",
] as const;

const ALLOWED_MODULES: ModuleKey[] = [
  "tasks",
  "bugs",
  "test-cases",
  "test-plans",
  "test-suites",
  "sprints",
  "deployments",
];

export async function updateItemField(
  module: string,
  id: string | number,
  field: string,
  value: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Validate field name to prevent injection
  if (!ALLOWED_FIELDS.includes(field as (typeof ALLOWED_FIELDS)[number])) {
    throw new Error(`Field "${field}" is not allowed for inline update`);
  }

  // Validate module
  if (!ALLOWED_MODULES.includes(module as ModuleKey)) {
    throw new Error(`Unknown module: ${module}`);
  }

  const table = getTableName(module as ModuleKey);
  if (!table) throw new Error(`No table found for module: ${module}`);

  await db.run(
    `UPDATE "${table}" SET "${field}" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER) AND "company" = ?`,
    [value, id, user.company],
  );

  await logActivity(
    user.company,
    module,
    String(id),
    "update",
    `Updated ${field} to "${value}"`,
    user.name || user.email || "",
  );

  return { success: true };
}

export async function deleteItem(module: string, id: string | number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  if (!ALLOWED_MODULES.includes(module as ModuleKey)) {
    throw new Error(`Unknown module: ${module}`);
  }

  const table = getTableName(module as ModuleKey);
  if (!table) throw new Error(`No table found for module: ${module}`);

  await db.run(
    `UPDATE "${table}" SET "deletedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER) AND "company" = ?`,
    [id, user.company],
  );

  await logActivity(
    user.company,
    module,
    String(id),
    "delete",
    `Soft-deleted item #${id}`,
    user.name || user.email || "",
  );

  return { success: true };
}
