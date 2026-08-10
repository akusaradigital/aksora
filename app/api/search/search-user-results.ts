import { codeFromId } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roles";
import { buildSearchTokenClause } from "@/lib/search-index";
import { buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchResult } from "./search-helpers";
export async function getUserResults(query: string, companyClause: string, companyParams: unknown[]) {
  const exactId = extractExactId(query, "USR");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, name, email, role, company, updatedAt
       FROM "User"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Users",
        group: "System Settings",
        href: "/users",
        code: codeFromId("USR", Number(exactRow.id)),
        label: normalize(exactRow.name) || normalize(exactRow.email),
        sublabel: [normalize(exactRow.email), getRoleLabel(String(exactRow.role ?? ""), String((exactRow as any).company ?? ""))].filter(Boolean).join(" · "),
        snippetSource: exactRow.email || exactRow.role,
        fieldScores: [
          ["name", 100],
          ["email", 90],
          ["role", 50],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const tokenClause = buildSearchTokenClause("users", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, name, email, role, company, updatedAt
     FROM "User"
     WHERE 1=1${tokenClause.clause}${companyClause}
     ORDER BY "updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Users",
        group: "System Settings",
        href: "/users",
        code: codeFromId("USR", Number(row.id)),
        label: normalize(row.name) || normalize(row.email),
        sublabel: [normalize(row.email), getRoleLabel(String(row.role ?? ""), String((row as any).company ?? ""))].filter(Boolean).join(" · "),
        snippetSource: row.email || row.role,
        fieldScores: [
          ["name", 100],
          ["email", 90],
          ["role", 50],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
