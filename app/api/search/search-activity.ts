import { codeFromId } from "@/lib/utils";
import { buildSearchTokenClause } from "@/lib/search-index";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";

export async function getActivityResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "ACT");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, entityType, entityId, action, summary, createdAt
       FROM "ActivityLog"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Activity",
        group: "Activity",
        href: "/dashboard",
        code: codeFromId("ACT", Number(exactRow.id)),
        label: `${normalize(exactRow.entityType)} ${normalize(exactRow.action)}`.trim(),
        sublabel: normalize(exactRow.entityId),
        snippetSource: exactRow.summary,
        fieldScores: [
          ["entityType", 85],
          ["entityId", 75],
          ["action", 60],
          ["summary", 35],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { dateColumn: '"createdAt"' });
  const tokenClause = buildSearchTokenClause("activity", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, entityType, entityId, action, summary, createdAt
     FROM "ActivityLog"
     WHERE 1=1${tokenClause.clause}${companyClause}${filter.clause}
     ORDER BY "createdAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams, filter.params),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Daily Log",
        group: "Activity",
        href: "/weekly-report",
        code: codeFromId("ACT", Number(row.id)),
        label: normalize(row.summary),
        sublabel: [normalize(row.entityType), normalize(row.action), normalize(row.entityId)].filter(Boolean).join(" · "),
        snippetSource: row.summary,
        fieldScores: [
          ["entityType", 70],
          ["entityId", 55],
          ["action", 80],
          ["summary", 100],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
