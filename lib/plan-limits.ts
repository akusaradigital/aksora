import { db } from "@/lib/db";

// Default max users per plan
export const PLAN_MAX_USERS: Record<string, number> = {
  free: 5,
  pro: 25,
  enterprise: 100,
};

/**
 * Check if a company has reached its user limit.
 * Returns { allowed: true } or { allowed: false, current, max, plan }
 */
export async function checkCompanyUserLimit(company: string): Promise<
  | { allowed: true }
  | { allowed: false; current: number; max: number; plan: string }
> {
  if (!company.trim()) return { allowed: true }; // superadmin has no company

  // Get company record
  const companyRow = await db.get<{ maxUsers: number; plan: string; status: string }>(
    'SELECT "maxUsers", "plan", "status" FROM "Company" WHERE "name" = ?',
    [company]
  );

  // If no Company record exists, allow (legacy/unmanaged)
  if (!companyRow) return { allowed: true };

  // If company is suspended, block
  if (companyRow.status === "suspended") {
    return { allowed: false, current: 0, max: 0, plan: companyRow.plan };
  }

  // Count active users in this company
  const row = await db.get<{ count: number }>(
    `SELECT COUNT(*) as "count" FROM "User" WHERE "company" = ? AND "deletedAt" IS NULL`,
    [company]
  );
  const currentUsers = Number(row?.count || 0);
  const maxUsers = companyRow.maxUsers;

  if (currentUsers >= maxUsers) {
    return { allowed: false, current: currentUsers, max: maxUsers, plan: companyRow.plan };
  }

  return { allowed: true };
}

/**
 * Get the default maxUsers for a plan
 */
export function getMaxUsersForPlan(plan: string): number {
  return PLAN_MAX_USERS[plan] || PLAN_MAX_USERS.free;
}
