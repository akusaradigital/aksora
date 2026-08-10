import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";
export async function getTaskResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "TASK");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, title, project, relatedFeature, category, status, priority, description, updatedAt
       FROM "Task"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Tasks",
        group: "Work Items",
        href: "/tasks",
        code: codeFromId("TASK", Number(exactRow.id)),
        label: normalize(exactRow.title),
        sublabel: [normalize(exactRow.project), normalize(exactRow.status)].filter(Boolean).join(" · "),
        snippetSource: exactRow.description,
        fieldScores: [
          ["title", 100],
          ["project", 70],
          ["relatedFeature", 75],
          ["category", 40],
          ["status", 30],
          ["priority", 30],
          ["description", 25],
          ["notes", 18],
          ["assignee", 20],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { statusColumn: '"status"', assigneeColumn: '"assignee"', dateColumn: '"endDate"' });
  const tokenClause = buildSearchTokenClause("tasks", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, title, project, relatedFeature, category, status, priority, description, updatedAt
     FROM "Task"
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
        type: "Tasks",
        group: "Work Items",
        href: "/tasks",
        code: codeFromId("TASK", Number(row.id)),
        label: normalize(row.title),
        sublabel: [normalize(row.project), normalize(row.status)].filter(Boolean).join(" · "),
        snippetSource: row.description,
        fieldScores: [
          ["title", 100],
          ["project", 70],
          ["relatedFeature", 75],
          ["category", 40],
          ["status", 30],
          ["priority", 30],
          ["description", 25],
          ["notes", 18],
          ["assignee", 20],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
