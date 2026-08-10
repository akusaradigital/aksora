import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";
export async function getSuiteResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "SUITE");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, title, assignee, status, notes, "publicToken", "testPlanId", "updatedAt"
       FROM "TestSuite"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Test Suites",
        group: "Test Management",
        href: `/test-suites/${encodeURIComponent(normalize(exactRow.publicToken))}`,
        code: codeFromId("SUITE", Number(exactRow.id)),
        label: normalize(exactRow.title),
        sublabel: [normalize(exactRow.assignee), normalize(exactRow.status)].filter(Boolean).join(" · "),
        snippetSource: exactRow.notes,
        fieldScores: [
          ["title", 100],
          ["status", 38],
          ["assignee", 26],
          ["notes", 20],
          ["publicToken", 18],
          ["testPlanTitle", 72],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { statusColumn: 'ts."status"', assigneeColumn: 'ts."assignee"', dateColumn: 'ts."updatedAt"' });
  const tokenClause = buildSearchTokenClause("test-suites", String(companyParams[0] ?? ""), query, "ts");
  const rows = await queryRows<Row>(
    `SELECT ts.id, ts.title, ts.status, ts.assignee, ts.notes, ts."publicToken", ts."testPlanId",
            tp.title AS planTitle, tp.project AS planProject, ts."updatedAt"
     FROM "TestSuite" ts
     LEFT JOIN "TestPlan" tp ON tp.id = CAST(ts."testPlanId" AS INTEGER) AND tp."deletedAt" IS NULL
     WHERE ts."deletedAt" IS NULL
       ${tokenClause.clause + companyClause.replace(/"company"/g, 'ts."company"') + filter.clause.replace(/"assignee"/g, 'ts."assignee"')}
     ORDER BY ts."updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams, filter.params),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Test Suites",
        group: "Test Management",
        href: `/test-suites/${normalize(row.publicToken)}`,
        code: codeFromId("SUITE", Number(row.id)),
        label: normalize(row.title),
        sublabel: [normalize(row.planTitle), normalize(row.planProject), normalize(row.status)].filter(Boolean).join(" · "),
        snippetSource: row.notes || row.assignee,
        fieldScores: [
          ["title", 100],
          ["status", 40],
          ["assignee", 25],
          ["notes", 20],
          ["publicToken", 16],
          ["planTitle", 80],
          ["planProject", 68],
          ["testPlanId", 36],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
