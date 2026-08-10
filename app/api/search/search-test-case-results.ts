import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";
export async function getTestCaseResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "TC");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT tc.id, tc."tcId", tc."caseName", tc."typeCase", tc.status, tc.priority,
              tc."preCondition", tc."testStep", tc."expectedResult", tc."actualResult", tc.evidence,
              tc."testSuiteId", ts.title AS suiteTitle, ts."publicToken" AS suiteToken,
              tp.title AS planTitle, tp.project AS planProject, tc."updatedAt"
       FROM "TestCase" tc
  LEFT JOIN "TestSuite" ts ON ts.id = CAST(tc."testSuiteId" AS INTEGER) AND ts."deletedAt" IS NULL
  LEFT JOIN "TestPlan" tp ON tp.id = CAST(ts."testPlanId" AS INTEGER) AND tp."deletedAt" IS NULL
       WHERE tc."deletedAt" IS NULL AND tc.id = ?
         ${companyClause.replace(/"company"/g, 'tc."company"')}
       ORDER BY tc."updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Test Case",
        group: "Test Management",
        href: normalize(exactRow.suiteToken)
          ? `/test-cases/detail/${encodeURIComponent(normalize(exactRow.suiteToken))}`
          : `/test-cases?q=${encodeURIComponent(String(exactRow.tcId ?? exactRow.caseName ?? query))}`,
        code: normalize(exactRow.tcId) || codeFromId("TC", Number(exactRow.id)),
        label: normalize(exactRow.caseName),
        sublabel: [normalize(exactRow.suiteTitle), normalize(exactRow.planTitle), normalize(exactRow.priority), normalize(exactRow.status)].filter(Boolean).join(" · "),
        snippetSource: exactRow.testStep || exactRow.expectedResult || exactRow.preCondition,
        fieldScores: [
          ["tcId", 92],
          ["caseName", 100],
          ["typeCase", 60],
          ["status", 35],
          ["priority", 35],
          ["preCondition", 30],
          ["testStep", 30],
          ["expectedResult", 26],
          ["actualResult", 22],
          ["suiteTitle", 78],
          ["planTitle", 70],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { statusColumn: 'tc."status"', assigneeColumn: 'ts."assignee"', dateColumn: 'tc."updatedAt"' });
  const tokenClause = buildSearchTokenClause("test-cases", String(companyParams[0] ?? ""), query, "tc");
  const rows = await queryRows<Row>(
    `SELECT tc.id, tc."tcId", tc."caseName", tc."typeCase", tc.status, tc.priority,
              tc."preCondition", tc."testStep", tc."expectedResult", tc."actualResult", tc.evidence,
              tc."testSuiteId", ts.title AS suiteTitle, ts."publicToken" AS suiteToken,
              tp.title AS planTitle, tp.project AS planProject, tc."updatedAt"
     FROM "TestCase" tc
  LEFT JOIN "TestSuite" ts ON ts.id = CAST(tc."testSuiteId" AS INTEGER) AND ts."deletedAt" IS NULL
  LEFT JOIN "TestPlan" tp ON tp.id = CAST(ts."testPlanId" AS INTEGER) AND tp."deletedAt" IS NULL
     WHERE tc."deletedAt" IS NULL
       ${tokenClause.clause + companyClause.replace(/"company"/g, 'tc."company"') + filter.clause.replace(/"assignee"/g, 'ts."assignee"')}
     ORDER BY tc."updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams, filter.params),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Test Case",
        group: "Test Management",
        href: normalize(row.suiteToken)
          ? `/test-cases/detail/${encodeURIComponent(normalize(row.suiteToken))}`
          : `/test-cases?q=${encodeURIComponent(String(row.tcId ?? row.caseName ?? query))}`,
        code: normalize(row.tcId) || codeFromId("TC", Number(row.id)),
        label: normalize(row.caseName),
        sublabel: [normalize(row.suiteTitle), normalize(row.planTitle), normalize(row.priority), normalize(row.status)].filter(Boolean).join(" · "),
        snippetSource: row.testStep || row.expectedResult || row.preCondition,
        fieldScores: [
          ["tcId", 92],
          ["caseName", 100],
          ["typeCase", 60],
          ["status", 35],
          ["priority", 35],
          ["preCondition", 30],
          ["testStep", 30],
          ["expectedResult", 26],
          ["actualResult", 22],
          ["suiteTitle", 78],
          ["planTitle", 70],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
