// Barrel re-export — split into focused files under lib/db/
export { databaseUrl, tables } from "@/lib/db/db-schema-tables";
export { indexSql } from "@/lib/db/db-schema-indexes";

import { tables } from "@/lib/db/db-schema-tables";
import { indexSql } from "@/lib/db/db-schema-indexes";

export function expandSchemaType(typeName: string) {
  if (typeName === "SERIAL_OR_PK") {
    return "SERIAL PRIMARY KEY";
  }
  if (typeName === "DATE_TYPE") {
    return "TIMESTAMP";
  }
  if (typeName === "FK_INT_SPRINT") {
    return "INTEGER";
  }
  return typeName;
}

function generateTableSchemaSql() {
  let sqlRows = "";

  for (const table of tables) {
    const s = table.schema
      .replace(/SERIAL_OR_PK|DATE_TYPE|FK_INT_SPRINT/g, (match) => expandSchemaType(match));

    sqlRows += `CREATE TABLE IF NOT EXISTS "${table.name}" (${s});\n`;
  }
  return sqlRows;
}

export const schemaTableSql = generateTableSchemaSql();
export const schemaIndexSql = indexSql;
export const schemaSql = `${schemaTableSql}${schemaIndexSql}`;
