/**
 * Migrate all data from SQLite (prisma/dev.db) to local Postgres (Docker).
 * Usage: node scripts/migrate-sqlite-to-pg.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const fs = await import("fs");
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const DATABASE_URL = envVars.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.startsWith("postgres")) {
  console.error("DATABASE_URL must be a postgres:// URL in .env");
  process.exit(1);
}

// Tables to migrate (order matters for foreign keys)
const TABLES = [
  "Company",
  "Sprint",
  "User",
  "Assignee",
  "Task",
  "Bug",
  "TestPlan",
  "TestSuite",
  "TestCase",
  "TestSession",
  "ExecutionRun",
  "CaseVerdict",
  "MeetingNote",
  "Deployment",
  "WorkLog",
  "ActivityLog",
  "SearchToken",
  "Invite",
  "DashboardComment",
  "DashboardFilter",
  "PresenceHeartbeat",
  "CollaborationPresence",
  "ModuleView",
  "NotificationPreference",
  "AdminAuditLog",
  "Announcement",
  "AdminNotification",
  "SupportTicket",
];

// Connect to SQLite
const { DatabaseSync } = await import("node:sqlite");
const sqlitePath = path.join(__dirname, "..", "prisma", "dev.db");
if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite file not found: ${sqlitePath}`);
  process.exit(1);
}
const sqlite = new DatabaseSync(sqlitePath);

// Connect to Postgres
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function migrateTable(tableName) {
  let rows;
  try {
    rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all();
  } catch (err) {
    console.log(`  ⚠ Table "${tableName}" not found in SQLite, skipping`);
    return 0;
  }

  if (!rows || rows.length === 0) {
    console.log(`  - "${tableName}": 0 rows (empty)`);
    return 0;
  }

  // Get valid Postgres columns for this table
  const { rows: pgCols } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  const validColumns = new Set(pgCols.map((r) => r.column_name));

  // Filter to only columns that exist in both SQLite and Postgres
  const allColumns = Object.keys(rows[0]);
  const columns = allColumns.filter((col) => validColumns.has(col));

  // Clear existing data in Postgres table
  await pool.query(`DELETE FROM "${tableName}"`);

  // NOT NULL columns with defaults we need to handle
  const notNullDefaults = {
    quarantined: 0,
    consecutivePasses: 0,
    sortOrder: 0,
  };

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    for (const row of batch) {
      const values = columns.map((col) => {
        const val = row[col];
        // Handle null values for NOT NULL columns
        if (val === null && col in notNullDefaults) {
          return notNullDefaults[col];
        }
        return val ?? null;
      });
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
      const colNames = columns.map((c) => `"${c}"`).join(", ");

      try {
        await pool.query(
          `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        inserted++;
      } catch (err) {
        if (!err.message.includes("duplicate key")) {
          console.log(`    ⚠ Row error in "${tableName}": ${err.message.slice(0, 80)}`);
        }
      }
    }
  }

  // Reset sequence to max id
  try {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX("id") FROM "${tableName}"), 1))`
    );
  } catch {
    // Table might not have a serial id
  }

  console.log(`  ✓ "${tableName}": ${inserted}/${rows.length} rows migrated`);
  return inserted;
}

console.log("🚀 Migrating SQLite → Postgres...\n");
console.log(`  Source: ${sqlitePath}`);
console.log(`  Target: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}\n`);

let totalRows = 0;
for (const table of TABLES) {
  totalRows += await migrateTable(table);
}

console.log(`\n✅ Done! ${totalRows} total rows migrated.`);

await pool.end();
sqlite.close();
