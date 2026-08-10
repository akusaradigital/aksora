import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";
export async function getSprintResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "SPR");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, name, "startDate", "endDate", status, goal, "updatedAt"
       FROM "Sprint"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Sprints",
        group: "Documentation",
        href: "/sprints",
        code: codeFromId("SPR", Number(exactRow.id)),
        label: normalize(exactRow.name),
        sublabel: [normalize(exactRow.startDate), normalize(exactRow.endDate), normalize(exactRow.status)].filter(Boolean).join(" · "),
        snippetSource: exactRow.goal,
        fieldScores: [
          ["name", 100],
          ["status", 35],
          ["goal", 25],
          ["startDate", 20],
          ["endDate", 20],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { statusColumn: '"status"', dateColumn: '"startDate"' });
  const tokenClause = buildSearchTokenClause("sprints", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, name, "startDate", "endDate", status, goal, "updatedAt"
     FROM "Sprint"
     WHERE 1=1${tokenClause.clause + companyClause + filter.clause}
     ORDER BY "updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams, filter.params),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Sprints",
        group: "Documentation",
        href: "/sprints",
        code: codeFromId("SPR", Number(row.id)),
        label: normalize(row.name),
        sublabel: [normalize(row.startDate), normalize(row.endDate), normalize(row.status)].filter(Boolean).join(" · "),
        snippetSource: row.goal,
        fieldScores: [
          ["name", 100],
          ["status", 35],
          ["goal", 25],
          ["startDate", 20],
          ["endDate", 20],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
