import { db } from "@/lib/db";
import { getAccessScope, logActivity, type CurrentUser } from "@/lib/data-helpers";
import { validateMidsceneYaml } from "@/lib/ai-runner";

/** Saves a Midscene script on a workspace-scoped test case. Returns an error message or null. */
export async function saveAutomationScript(user: NonNullable<CurrentUser>, testCaseId: string | number, script: string, summary: string) {
  // An empty script clears it; anything else must pass the structural check.
  const invalid = script.trim() ? validateMidsceneYaml(script) : null;
  if (invalid) return { error: invalid, status: 400 };
  const { andWhere, params } = getAccessScope(user);
  const tc = await db.get<{ id: number; tcId: string; company: string; workspaceId: number | null; publicToken: string }>(
    `SELECT "id", "tcId", "company", "workspaceId", "publicToken" FROM "TestCase" WHERE "id" = CAST(? AS INTEGER) AND "deletedAt" IS NULL${andWhere}`,
    [testCaseId, ...params],
  );
  if (!tc) return { error: "Test case not found", status: 404 };
  await db.run(
    `UPDATE "TestCase" SET "automationScript" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)`,
    [script, tc.id],
  );
  await logActivity(tc.company, "TestCase", String(tc.tcId), "Updated", `${summary}: ${tc.tcId}`, user.name || user.email || "", tc.publicToken, tc.workspaceId);
  return null;
}
