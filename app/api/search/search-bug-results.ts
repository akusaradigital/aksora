import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";

export async function getBugResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "BUG");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, title, project, module, severity, priority, status, stepsToReproduce, expectedResult, actualResult, updatedAt
       FROM "Bug"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Bugs",
        group: "Work Items",
        href: "/bugs",
        code: codeFromId("BUG", Number(exactRow.id)),
        label: normalize(exactRow.title),
        sublabel: [normalize(exactRow.project), normalize(exactRow.severity), normalize(exactRow.status)].filter(Boolean).join(" · "),
        snippetSource: exactRow.stepsToReproduce || exactRow.expectedResult || exactRow.actualResult,
        fieldScores: [
          ["title", 100],
          ["project", 72],
          ["module", 65],
          ["bugType", 55],
          ["severity", 40],
          ["priority", 35],
          ["status", 30],
          ["preconditions", 22],
          ["stepsToReproduce", 28],
          ["expectedResult", 24],
          ["actualResult", 20],
          ["relatedItems", 18],
          ["suggestedDev", 18],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }

  const filter = buildFilterClause(filters, { statusColumn: '"status"', assigneeColumn: '"suggestedDev"', dateColumn: '"updatedAt"' });
  const tokenClause = buildSearchTokenClause("bugs", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, title, project, module, bugType, severity, priority, status, stepsToReproduce, expectedResult, actualResult, updatedAt
     FROM "Bug"
     WHERE 1=1${tokenClause.clause}${companyClause}${filter.clause}
     ORDER BY "updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams, filter.params),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Bugs",
        group: "Work Items",
        href: "/bugs",
        code: codeFromId("BUG", Number(row.id)),
        label: normalize(row.title),
        sublabel: [normalize(row.project), normalize(row.severity), normalize(row.status)].filter(Boolean).join(" · "),
        snippetSource: row.stepsToReproduce || row.expectedResult || row.actualResult,
        fieldScores: [
          ["title", 100],
          ["project", 70],
          ["module", 55],
          ["bugType", 50],
          ["severity", 45],
          ["priority", 35],
          ["status", 35],
          ["preconditions", 25],
          ["stepsToReproduce", 30],
          ["expectedResult", 20],
          ["actualResult", 20],
          ["relatedItems", 18],
          ["suggestedDev", 18],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
