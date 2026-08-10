import { databaseUrl, schemaIndexSql, schemaTableSql, tables, expandSchemaType } from "@/lib/db-schema";
import { toPostgresQuery, type PostgresPool } from "@/lib/db-query-utils";

export type DbBootstrapDeps = {
  getPostgresPool: () => Promise<PostgresPool>;
  getSchemaInitPromise: () => Promise<void> | undefined;
  setSchemaInitPromise: (value: Promise<void> | undefined) => void;
};

async function execSchemaSql(queryStr: string, deps: DbBootstrapDeps) {
  const pool = await deps.getPostgresPool();
  const statements = queryStr.split(";").filter((s) => s.trim());
  await Promise.all(
    statements.map(async (s) => {
      try {
        await pool.query(toPostgresQuery(s));
      } catch (err: unknown) {
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err.code === "42P07" || err.code === "23505")
        ) {
          return;
        }
      }
    }),
  );
}

async function applyMissingColumns(deps: DbBootstrapDeps) {
  const columnQueries = tables.flatMap((table) =>
    table.schema
      .split("\n")
      .map((line) => line.trim().replace(/,$/, ""))
      .filter(Boolean)
      .map((def) => ({ table: table.name, def })),
  );

  const pool = await deps.getPostgresPool();
  const tableNames = [...new Set(tables.map((table) => table.name))];
  const placeholders = tableNames.map((_, i) => `$${i + 1}`).join(", ");
  let existingCols: Set<string>;
  try {
    const { rows } = await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (${placeholders})`,
      tableNames,
    );
    existingCols = new Set((rows as { table_name: string; column_name: string }[]).map((row) => `${row.table_name}.${row.column_name}`));
  } catch {
    existingCols = new Set();
  }

  for (const { table, def } of columnQueries) {
    if (def.startsWith("PRIMARY") || def.startsWith("FOREIGN") || def.startsWith("id ")) continue;
    const firstSpace = def.indexOf(" ");
    if (firstSpace <= 0) continue;
    const rawColumn = def.slice(0, firstSpace).trim();
    const rawType = def.slice(firstSpace + 1).trim().split(/\s+/)[0] || "TEXT";
    const columnName = rawColumn.replace(/"/g, "");
    if (existingCols.has(`${table}.${columnName}`)) continue;
    try {
      await pool.query(toPostgresQuery(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${columnName}" ${expandSchemaType(rawType)}`));
    } catch {
    }
  }
}

async function backfillPublicTokens(deps: DbBootstrapDeps) {
  const tablesToFill = [
    { table: "TestPlan", column: "publicToken" },
    { table: "TestSuite", column: "publicToken" },
    { table: "TestCase", column: "publicToken" },
    { table: "MeetingNote", column: "publicToken" },
    { table: "Task", column: "publicToken" },
    { table: "Bug", column: "publicToken" },
    { table: "TestSession", column: "publicToken" },
    { table: "Sprint", column: "publicToken" },
    { table: "Deployment", column: "publicToken" },
    { table: "WorkLog", column: "publicToken" },
    { table: "ModuleView", column: "publicToken" },
  ];

  const pool = await deps.getPostgresPool();
  await Promise.all(
    tablesToFill.map(({ table, column }) =>
      pool.query(`UPDATE "${table}" SET "${column}" = md5(random()::text || id::text) WHERE COALESCE("${column}", '') = ''`),
    ),
  );
}

async function backfillSearchTokenEntityIdInt(deps: DbBootstrapDeps) {
  const pool = await deps.getPostgresPool();
  await pool.query(
    `UPDATE "SearchToken" SET "entityIdInt" = CAST("entityId" AS INTEGER) WHERE COALESCE("entityIdInt", 0) = 0`,
  );
}

async function backfillSortOrder(deps: DbBootstrapDeps) {
  const tablesToFill = ["Task", "Bug", "TestCase", "Sprint", "TestPlan", "TestSession", "TestSuite", "MeetingNote", "Deployment", "Assignee", "User"];

  const pool = await deps.getPostgresPool();
  const existing = await Promise.all(
    tablesToFill.map(async (table) => {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'sortOrder' LIMIT 1`,
        [table],
      );
      if (rows.length === 0) return null;
      const { rows: needRows } = await pool.query(`SELECT 1 FROM "${table}" WHERE "sortOrder" = 0 LIMIT 1`);
      return needRows.length > 0 ? table : null;
    }),
  );
  await Promise.all(
    existing.filter(Boolean).map((table) =>
      pool.query(`WITH ranked AS (
        SELECT id, (SELECT COALESCE(MAX("sortOrder"), 0) FROM "${table}") + ROW_NUMBER() OVER (ORDER BY COALESCE("updatedAt", "createdAt") ASC, id ASC) AS rn
        FROM "${table}"
        WHERE "sortOrder" = 0
      ) UPDATE "${table}" t SET "sortOrder" = ranked.rn FROM ranked WHERE t.id = ranked.id`),
    ),
  );
}

async function ensureKanbanSortOrderColumns(deps: DbBootstrapDeps) {
  const tablesToFix = ["Task", "Bug", "TestCase", "Sprint", "TestPlan", "TestSession", "TestSuite", "MeetingNote", "Deployment", "Assignee", "User"];

  const pool = await deps.getPostgresPool();
  for (const table of tablesToFix) {
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'sortOrder' LIMIT 1`,
        [table],
      );
      if (rows.length > 0) continue;
      await pool.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`);
    } catch {
    }
  }
}

const globalBootstrap = globalThis as unknown as { __schemaBootstrapDone?: boolean; __schemaVersion?: number };

const CURRENT_MIGRATION_VERSION = 6;

async function getMigrationVersion(deps: DbBootstrapDeps): Promise<number> {
  try {
    const pool = await deps.getPostgresPool();
    const { rows } = await pool.query('SELECT "version" FROM "_migrations" ORDER BY "version" DESC LIMIT 1');
    return (rows[0] as { version: number })?.version ?? 0;
  } catch {
    return 0;
  }
}

async function setMigrationVersion(deps: DbBootstrapDeps, version: number): Promise<void> {
  const createSql = `CREATE TABLE IF NOT EXISTS "_migrations" ("version" INTEGER NOT NULL, "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`;
  const insertSql = `INSERT INTO "_migrations" ("version") VALUES ($1)`;
  const pool = await deps.getPostgresPool();
  await pool.query(createSql);
  await pool.query(insertSql, [version]);
}

async function migrateTaskDueDateToStartEnd(deps: DbBootstrapDeps) {
  const pool = await deps.getPostgresPool();
  // Add startDate/endDate columns if they don't exist
  try {
    await pool.query(`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TEXT`);
    await pool.query(`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "endDate" TEXT`);
  } catch { /* columns may already exist */ }
  // Copy dueDate data to startDate/endDate where they are empty
  try {
    await pool.query(`UPDATE "Task" SET "startDate" = "dueDate" WHERE COALESCE("startDate", '') = '' AND COALESCE("dueDate", '') != ''`);
    await pool.query(`UPDATE "Task" SET "endDate" = "dueDate" WHERE COALESCE("endDate", '') = '' AND COALESCE("dueDate", '') != ''`);
  } catch { /* ignore if dueDate column doesn't exist */ }
}

export async function ensureSchemaBootstrap(deps: DbBootstrapDeps) {
  if (typeof window !== "undefined") return;
  if (globalBootstrap.__schemaVersion !== CURRENT_MIGRATION_VERSION) {
    globalBootstrap.__schemaBootstrapDone = false;
    deps.setSchemaInitPromise(undefined);
    globalBootstrap.__schemaVersion = CURRENT_MIGRATION_VERSION;
  }
  if (!deps.getSchemaInitPromise()) {
    deps.setSchemaInitPromise((async () => {
      try {
        await execSchemaSql(schemaTableSql, deps);
        await applyMissingColumns(deps);
        await ensureKanbanSortOrderColumns(deps);

        if (!globalBootstrap.__schemaBootstrapDone) {
          const currentVersion = await getMigrationVersion(deps);
          if (currentVersion < CURRENT_MIGRATION_VERSION) {
            await backfillSearchTokenEntityIdInt(deps);
            await execSchemaSql(schemaIndexSql, deps);
            await backfillPublicTokens(deps);
            await backfillSortOrder(deps);
            await migrateTaskDueDateToStartEnd(deps);
            await setMigrationVersion(deps, CURRENT_MIGRATION_VERSION);
          }
          globalBootstrap.__schemaBootstrapDone = true;
        }
      } catch (err) {
        deps.setSchemaInitPromise(undefined);
        if (databaseUrl) {
          console.error("Schema init error:", err);
        }
      }
    })());
  }
  return deps.getSchemaInitPromise();
}
