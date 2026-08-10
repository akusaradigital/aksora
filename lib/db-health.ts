import { db } from "@/lib/db";
import { tables } from "@/lib/db/db-schema-tables";

export type SchemaHealthTable = {
  table: string;
  missingColumns: string[];
  extraColumns: string[];
};

export async function getSchemaHealth() {
  const tableNames = [...new Set(tables.map((table) => table.name))];
  const rows = await db.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY(?)`,
    [tableNames],
  );

  const actual = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name)!.add(row.column_name);
  }

  const tablesHealth: SchemaHealthTable[] = [];
  for (const table of tables) {
    const expected = table.schema
      .split("\n")
      .map((line) => line.trim().replace(/,$/, ""))
      .filter(Boolean)
      .map((def) => def.split(" ")[0]?.replace(/"/g, ""))
      .filter(Boolean) as string[];
    const actualColumns = actual.get(table.name) || new Set<string>();
    const missingColumns = expected.filter((column) => !actualColumns.has(column) && !["PRIMARY", "FOREIGN"].includes(column));
    const extraColumns = [...actualColumns].filter((column) => !expected.includes(column));
    tablesHealth.push({ table: table.name, missingColumns, extraColumns });
  }

  const issues = tablesHealth.filter((table) => table.missingColumns.length > 0 || table.extraColumns.length > 0);
  return {
    ok: issues.length === 0,
    issues,
    totalTables: tablesHealth.length,
  };
}
