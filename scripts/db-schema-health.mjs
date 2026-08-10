import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = process.cwd();
const envText = fs.readFileSync(path.join(root, ".env"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const schemaText = fs.readFileSync(path.join(root, "lib", "db", "db-schema-tables.ts"), "utf8");
const tableRegex = /name:\s*"([^"]+)"\s*,\s*schema:\s*`([\s\S]*?)`/g;
const expectedByTable = new Map();
let match;
while ((match = tableRegex.exec(schemaText)) !== null) {
  const table = match[1];
  const schema = match[2];
  const columns = schema
    .split("\n")
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean)
    .map((def) => def.split(" ")[0]?.replace(/"/g, ""))
    .filter(Boolean)
    .filter((name) => name !== "PRIMARY" && name !== "FOREIGN");
  expectedByTable.set(table, columns);
}

const url = env.DATABASE_URL || env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL missing");
const client = new Client({ connectionString: url });
await client.connect();

const tableNames = [...expectedByTable.keys()];
const rows = await client.query(
  `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
  [tableNames],
);

const actualByTable = new Map();
for (const row of rows.rows) {
  if (!actualByTable.has(row.table_name)) actualByTable.set(row.table_name, new Set());
  actualByTable.get(row.table_name).add(row.column_name);
}

const softAllow = new Set(["sortOrder"]);
const issues = [];
for (const [table, expected] of expectedByTable.entries()) {
  const actual = actualByTable.get(table) || new Set();
  const missingColumns = expected.filter((column) => !actual.has(column));
  const extraColumns = [...actual].filter((column) => !expected.includes(column) && !softAllow.has(column));
  if (missingColumns.length || extraColumns.length) {
    issues.push({ table, missingColumns, extraColumns });
  }
}

const result = { ok: issues.length === 0, totalTables: tableNames.length, issues };
console.log(JSON.stringify(result, null, 2));
await client.end();
process.exit(result.ok ? 0 : 1);
