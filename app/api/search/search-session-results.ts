import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";

export async function getSessionResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "SES");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, date, project, sprint, tester, scope, result, notes, evidence, updatedAt
       FROM "TestSession"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Test Sessions",
        group: "Test Management",
        href: "/test-execution",
        code: codeFromId("SES", Number(exactRow.id)),
        label: normalize(exactRow.date),
        sublabel: [normalize(exactRow.project), normalize(exactRow.sprint), normalize(exactRow.tester), normalize(exactRow.result)].filter(Boolean).join(" · "),
        snippetSource: exactRow.notes || exactRow.scope,
        fieldScores: [
          ["date", 100],
          ["project", 55],
          ["sprint", 50],
          ["tester", 45],
          ["scope", 28],
          ["result", 30],
          ["notes", 18],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { statusColumn: '"result"', assigneeColumn: '"tester"', dateColumn: '"date"' });
  const tokenClause = buildSearchTokenClause("test-sessions", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, date, project, sprint, tester, scope, result, notes, evidence, updatedAt
     FROM "TestSession"
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
        type: "Test Sessions",
        group: "Test Management",
        href: "/test-execution",
        code: codeFromId("SES", Number(row.id)),
        label: [normalize(row.project), normalize(row.sprint)].filter(Boolean).join(" / ") || `Session ${row.id}`,
        sublabel: [normalize(row.date), normalize(row.tester), normalize(row.result)].filter(Boolean).join(" · "),
        snippetSource: row.scope || row.notes || row.evidence,
        fieldScores: [
          ["project", 80],
          ["sprint", 75],
          ["tester", 78],
          ["scope", 60],
          ["result", 40],
          ["notes", 20],
          ["date", 20],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
