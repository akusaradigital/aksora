/**
 * scripts/cleanup-legacy-company-columns.mjs
 *
 * Safety check + report for legacy `company` column cleanup.
 * DRY-RUN by default. Pass --apply to execute ALTER TABLE DROP COLUMN.
 *
 * Usage:
 *   node scripts/cleanup-legacy-company-columns.mjs           # dry-run report
 *   node scripts/cleanup-legacy-company-columns.mjs --apply   # drop columns
 */

import pg from "pg";

const { Pool } = pg;
const APPLY = process.argv.includes("--apply");

const TABLES_WITH_COMPANY = [
  "Sprint", "Task", "Bug", "TestCase", "TestPlan", "TestSession", "TestSuite",
  "ActivityLog", "SearchToken", "MeetingNote", "Assignee", "User",
  "Deployment", "ExecutionRun", "CaseVerdict", "DashboardComment",
  "PresenceHeartbeat", "DashboardFilter", "WorkLog", "CollaborationPresence",
  "ModuleView", "NotificationPreference",
];

// Tables that legitimately KEEP `company` (no workspaceId equivalent yet)
const SKIP_TABLES = new Set([
  "Company", "SupportTicket", "Announcement", "AdminNotification",
  "Invite", // still has workspaceId but also company for display
]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log(`\n=== Aksora legacy 'company' column cleanup — ${APPLY ? "APPLY MODE" : "DRY-RUN"} ===\n`);

    const results = [];

    for (const table of TABLES_WITH_COMPANY) {
      if (SKIP_TABLES.has(table)) {
        results.push({ table, status: "skipped (no workspaceId equivalent)" });
        continue;
      }

      // Check column exists
      const colCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'company' LIMIT 1`,
        [table],
      );
      if (colCheck.rows.length === 0) {
        results.push({ table, status: "company column absent — already clean" });
        continue;
      }

      // Count rows missing workspaceId
      const orphanCheck = await client.query(
        `SELECT COUNT(*) AS n FROM "${table}" WHERE "workspaceId" IS NULL AND COALESCE("company", '') != ''`,
      );
      const orphans = Number(orphanCheck.rows[0]?.n ?? 0);

      const totalCheck = await client.query(`SELECT COUNT(*) AS n FROM "${table}"`);
      const total = Number(totalCheck.rows[0]?.n ?? 0);

      if (orphans > 0) {
        results.push({
          table,
          total,
          orphans,
          status: `⚠  BLOCKED — ${orphans} row(s) still have company but no workspaceId`,
        });
        continue;
      }

      if (!APPLY) {
        results.push({ table, total, orphans: 0, status: "✓ SAFE to drop (dry-run, not applied)" });
        continue;
      }

      // APPLY: drop the company column
      try {
        await client.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "company"`);
        results.push({ table, total, orphans: 0, status: "✓ DROPPED company column" });
      } catch (err) {
        results.push({ table, total, orphans: 0, status: `✗ DROP FAILED: ${err.message}` });
      }
    }

    // Print report
    const colW = 30;
    console.log(`${"Table".padEnd(colW)} Status`);
    console.log("-".repeat(80));
    for (const r of results) {
      const total = r.total !== undefined ? ` (${r.total} rows)` : "";
      console.log(`${r.table.padEnd(colW)} ${r.status}${total}`);
    }

    const blocked = results.filter((r) => r.status?.startsWith("⚠"));
    console.log(`\n${blocked.length} table(s) blocked, ${results.length - blocked.length} ready/clean.`);
    if (blocked.length > 0) {
      console.log("Run backfillWorkspaceIds in db-bootstrap.ts first, then re-run this script.");
    }
    if (!APPLY && blocked.length === 0) {
      console.log("All clear. Re-run with --apply to drop columns.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
