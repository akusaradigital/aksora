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
    let connectionString = databaseUrl;

    // ponytail: auto-detect and switch to neon pooler host if neon.tech is used without -pooler
    if (isNeon && !connectionString.includes("-pooler")) {
      try {
        const urlObj = new URL(connectionString);
        if (urlObj.hostname.endsWith(".neon.tech") && !urlObj.hostname.includes("-pooler")) {
          const parts = urlObj.hostname.split(".");
          parts[0] = `${parts[0]}-pooler`;
          urlObj.hostname = parts.join(".");
          connectionString = urlObj.toString();
        }
      } catch {
        // Fallback to original connection string if parsing fails
      }
    }

    const poolConfig = {
      connectionString,
      max: isNeon ? 5 : 10,
      min: 0,
      idleTimeoutMillis: isNeon ? 5000 : 15000,
      connectionTimeoutMillis: 3000,
      allowExitOnIdle: true,
      statement_timeout: 5000,
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
  // ponytail: ensure concurrent requests await the exact same bootstrap promise to prevent races
  if (!globalForDb.schemaInitPromise) {
    globalForDb.schemaInitPromise = ensureSchemaBootstrap({
      getPostgresPool,
      getSchemaInitPromise: () => globalForDb.schemaInitPromise,
      setSchemaInitPromise: (value) => {
        globalForDb.schemaInitPromise = value;
      },
    });
  }
  await globalForDb.schemaInitPromise;
  globalForDb.schemaReady = true;
}

function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const code = typeof err === "object" && "code" in err ? String((err as { code: unknown }).code || "") : "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === "57P01" ||
    code === "08006" ||
    code === "08001" ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("timeout exceeded") ||
    message.includes("pool timeout")
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryRaw<T>(queryStr: string, params: unknown[] = []): Promise<T[]> {
  const pgQuery = toPostgresQuery(queryStr);
  const tx = txStorage.getStore();
  if (tx) {
    const { rows } = await tx.query(pgQuery, params);
    return rows as T[];
  }

  let attempts = 0;
  while (true) {
    try {
      const pool = await getPostgresPool();
      const { rows } = await pool.query(pgQuery, params);
      return rows as T[];
    } catch (err) {
      attempts++;
      if (attempts <= 2 && isTransientError(err)) {
        const backoff = Math.min(150, 50 * Math.pow(2, attempts - 1) + Math.random() * 50);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function runRaw(queryStr: string, params: unknown[] = []): Promise<void> {
  const pgQuery = toPostgresQuery(queryStr);
  const tx = txStorage.getStore();
  if (tx) {
    await tx.query(pgQuery, params);
    return;
  }

  let attempts = 0;
  while (true) {
    try {
      const pool = await getPostgresPool();
      await pool.query(pgQuery, params);
      return;
    } catch (err) {
      attempts++;
      if (attempts <= 2 && isTransientError(err)) {
        const backoff = Math.min(150, 50 * Math.pow(2, attempts - 1) + Math.random() * 50);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
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

