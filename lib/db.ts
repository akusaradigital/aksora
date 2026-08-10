import { AsyncLocalStorage } from "async_hooks";
import {
  databaseUrl,
  tables,
} from "@/lib/db-schema";
import { toPostgresQuery, type PostgresClient, type PostgresPool } from "@/lib/db-query-utils";
import { ensureSchemaBootstrap } from "@/lib/db-bootstrap";

export { databaseUrl, schemaIndexSql, schemaSql, schemaTableSql, tables } from "@/lib/db-schema";

// Transaction context: while a db.transaction() callback runs, every db.query/db.get/db.run
// inside it (including deep helper calls) routes through the checked-out client, so the
// statements actually participate in the BEGIN/COMMIT. Falls back to the shared pool otherwise.
const txStorage = new AsyncLocalStorage<PostgresClient>();

const globalForDb = globalThis as unknown as {
  pgPool?: unknown;
  schemaInitPromise?: Promise<void>;
  schemaReady?: boolean;
};

async function getPostgresPool() {
  if (!globalForDb.pgPool) {
    const isNeon = databaseUrl.includes("neon.tech") || databaseUrl.includes("neon-");
    const poolConfig = {
      connectionString: databaseUrl,
      max: isNeon ? 10 : 20,
      min: isNeon ? 0 : 2,
      idleTimeoutMillis: isNeon ? 10000 : 30000,
      connectionTimeoutMillis: isNeon ? 10000 : 5000,
      allowExitOnIdle: isNeon,
    };
    let pool;
    if (isNeon) {
      const { Pool } = await import("@neondatabase/serverless");
      pool = new Pool(poolConfig);
    } else {
      const { Pool } = await import("pg");
      pool = new Pool(poolConfig);
    }
    pool.on("error", (err: Error) => {
      console.error("[DB Pool] Unexpected error on idle client:", err.message);
    });
    globalForDb.pgPool = pool;
  }
  return globalForDb.pgPool as PostgresPool;
}

async function ensureSchema() {
  if (globalForDb.schemaReady) return;
  await ensureSchemaBootstrap({
    getPostgresPool,
    getSchemaInitPromise: () => globalForDb.schemaInitPromise,
    setSchemaInitPromise: (value) => {
      globalForDb.schemaInitPromise = value;
    },
  });
  globalForDb.schemaReady = true;
}

async function queryRaw<T>(queryStr: string, params: unknown[] = []): Promise<T[]> {
  const pgQuery = toPostgresQuery(queryStr);
  const tx = txStorage.getStore();
  if (tx) {
    const { rows } = await tx.query(pgQuery, params);
    return rows as T[];
  }
  const pool = await getPostgresPool();
  const { rows } = await pool.query(pgQuery, params);
  return rows as T[];
}

async function runRaw(queryStr: string, params: unknown[] = []): Promise<void> {
  const pgQuery = toPostgresQuery(queryStr);
  const tx = txStorage.getStore();
  if (tx) {
    await tx.query(pgQuery, params);
    return;
  }
  const pool = await getPostgresPool();
  await pool.query(pgQuery, params);
}

async function execRaw(queryStr: string): Promise<void> {
  const pool = await getPostgresPool();
  const statements = queryStr.split(";").filter((s) => s.trim());
  for (const s of statements) {
    try {
      await pool.query(toPostgresQuery(s));
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err.code === "42P07" || err.code === "23505")
      ) {
        continue;
      }
      throw err;
    }
  }
}

export const db = {
  async query<T>(queryStr: string, params: unknown[] = []): Promise<T[]> {
    await ensureSchema();
    return queryRaw<T>(queryStr, params);
  },

  async get<T>(queryStr: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await db.query<T>(queryStr, params);
    return rows[0];
  },

  async run(queryStr: string, params: unknown[] = []): Promise<void> {
    await ensureSchema();
    // All tables use SERIAL PRIMARY KEY — let Postgres assign "id". The explicit-id
    // machinery (SELECT MAX + retry) is gone: it cost an extra round-trip per write
    // and raced under concurrency. Callers needing the new id use db.get(... RETURNING).
    await runRaw(queryStr, params);
  },

  async exec(queryStr: string): Promise<void> {
    await execRaw(queryStr);
  },

  async transaction<T>(fn: (client?: PostgresClient) => Promise<T>): Promise<T> {
    await ensureSchema();
    const pool = await getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Run fn with the client as the async-local tx context so any db.query/get/run
      // it triggers (including deep helpers) stays on this connection inside the BEGIN.
      const result = await txStorage.run(client, () => fn(client));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

// Free-tier monitoring: connection pool usage + approximate row counts, for /api/health.
// Pool stats only exist after the pool has been touched; pg/@neondatabase expose these
// counters on the Pool instance.
export async function getDbHealthInfo() {
  const pool = await getPostgresPool();
  const p = pool as unknown as {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    max?: number;
  };
  const conn =
    p.totalCount === undefined
      ? null
      : { total: p.totalCount, idle: p.idleCount ?? 0, waiting: p.waitingCount ?? 0, max: p.max ?? 0 };

  // Approximate row counts per table — one round-trip via the Postgres catalog
  // (n_live_tup is an estimate; plenty for spotting free-tier growth).
  let tableCounts: Record<string, number> = {};
  try {
    const names = tables.map((t) => t.name);
    const rows = await db.query<{ relname: string; n: number }>(
      `SELECT relname, n_live_tup as n FROM pg_stat_user_tables WHERE relname = ANY($1::text[])`,
      [names],
    );
    tableCounts = Object.fromEntries(rows.map((r) => [r.relname, Number(r.n ?? 0)]));
  } catch {
    tableCounts = {};
  }
  return { conn, tables: tableCounts };
}

export async function resetTables() {
  const tableNames = tables.map((table) => `"${table.name}"`);
  await db.exec(`TRUNCATE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`);
}

