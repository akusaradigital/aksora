export type PostgresClient = {
  query: (queryText: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  release: () => void;
};

export type PostgresPool = {
  query: (queryText: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  connect: () => Promise<PostgresClient>;
};

function normalizePostgresQuery(queryStr: string) {
  return queryStr;
}

export function toPostgresQuery(queryStr: string) {
  let pgQuery = normalizePostgresQuery(queryStr);
  pgQuery = pgQuery
    .replace(/DATE\('now'\)/gi, "CURRENT_DATE")
    .replace(/DATE\('now',\s*'-(\d+)\s+days'\)/gi, (_, d) => `CURRENT_DATE - INTERVAL '${d} days'`)
    .replace(/DATE\('now',\s*'\+(\d+)\s+days'\)/gi, (_, d) => `CURRENT_DATE + INTERVAL '${d} days'`)
    .replace(/DATE\(([^'()\s][^()]*)\)/gi, (_, col) => `(${col.trim()})::date`);
  if (pgQuery.includes("?")) {
    let count = 0;
    pgQuery = pgQuery.replace(/\?/g, () => `$${++count}`);
  }
  return pgQuery;
}

export function parseInsertStatement(queryStr: string) {
  // Skip bulk inserts with multiple VALUES groups
  const valuesIdx = queryStr.toUpperCase().indexOf("VALUES");
  if (valuesIdx >= 0) {
    const afterValues = queryStr.slice(valuesIdx + 6);
    const openParens = afterValues.split("(").length - 1;
    if (openParens > 1) return null;
  }

  // Skip inserts that already carry an explicit "id" column — those are
  // deliberate (imports/backfills) and must be executed as-is.
  if (/^\s*INSERT(?:\s+OR\s+\w+)?\s+INTO\s+"([^"]+)"\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)([\s\S]*)$/i.test(queryStr)) {
    const colMatch = queryStr.match(/^\s*INSERT(?:\s+OR\s+\w+)?\s+INTO\s+"([^"]+)"\s*\(([\s\S]*?)\)\s*VALUES/i);
    if (colMatch && colMatch[2] && colMatch[2].split(",").some((c) => c.trim().replace(/^"|"$/g, "") === "id")) {
      return null;
    }
  }

  const match = queryStr.match(/^\s*INSERT(?:\s+OR\s+\w+)?\s+INTO\s+"([^"]+)"\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)([\s\S]*)$/i);
  if (!match) return null;

  const [, table, columnsRaw, valuesRaw, suffix] = match;
  const columns = columnsRaw
    .split(",")
    .map((column) => column.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
  const values = valuesRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return { table, columns, values, suffix };
}

export function isSequentialIdConflict(err: unknown, table: string) {
  if (typeof err !== "object" || err === null) return false;
  const error = err as { code?: string; message?: string; detail?: string };
  const message = String(error.message ?? "").toLowerCase();
  const detail = String(error.detail ?? "").toLowerCase();
  const tableName = table.toLowerCase();

  if (message.includes("unique constraint failed") && message.includes(`${tableName}.id`)) {
    return true;
  }
  if (detail.includes("(id)=")) {
    return true;
  }
  return false;
}
