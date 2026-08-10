import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";

export async function getDeploymentResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "DEP");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, date, version, project, environment, developer, changelog, status, notes, updatedAt
       FROM "Deployment"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Deployment Log",
        group: "Documentation",
        href: "/deployments",
        code: codeFromId("DEP", Number(exactRow.id)),
        label: normalize(exactRow.version),
        sublabel: [normalize(exactRow.project), normalize(exactRow.environment), normalize(exactRow.date)].filter(Boolean).join(" · "),
        snippetSource: exactRow.changelog || exactRow.notes,
        fieldScores: [
          ["version", 100],
          ["project", 72],
          ["environment", 45],
          ["developer", 32],
          ["status", 30],
          ["notes", 18],
          ["date", 18],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { statusColumn: '"status"', assigneeColumn: '"developer"', dateColumn: '"date"' });
  const tokenClause = buildSearchTokenClause("deployments", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, date, version, project, environment, developer, changelog, status, notes, updatedAt
     FROM "Deployment"
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
        type: "Deployment Log",
        group: "Documentation",
        href: "/deployments",
        code: codeFromId("DEP", Number(row.id)),
        label: normalize(row.version),
        sublabel: [normalize(row.project), normalize(row.environment), normalize(row.date)].filter(Boolean).join(" · "),
        snippetSource: row.changelog || row.notes || row.developer,
        fieldScores: [
          ["version", 100],
          ["project", 75],
          ["environment", 55],
          ["developer", 70],
          ["changelog", 25],
          ["status", 30],
          ["notes", 22],
          ["date", 20],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
