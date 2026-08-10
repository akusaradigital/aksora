import { codeFromId } from "@/lib/utils";
import { buildFilterClause, buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchFilters, type SearchResult } from "./search-helpers";
import { buildSearchTokenClause } from "@/lib/search-index";
export async function getMeetingResults(query: string, companyClause: string, companyParams: unknown[], filters: SearchFilters = {}) {
  const exactId = extractExactId(query, "MTG");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, date, project, title, attendees, content, actionItems, updatedAt
       FROM "MeetingNote"
       WHERE "deletedAt" IS NULL AND id = ?${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Meeting Notes",
        group: "Documentation",
        href: "/meeting-notes",
        code: codeFromId("MTG", Number(exactRow.id)),
        label: normalize(exactRow.title),
        sublabel: [normalize(exactRow.project), normalize(exactRow.date)].filter(Boolean).join(" · "),
        snippetSource: exactRow.actionItems || exactRow.content || exactRow.attendees,
        fieldScores: [
          ["title", 100],
          ["project", 75],
          ["attendees", 40],
          ["content", 25],
          ["actionItems", 25],
          ["date", 20],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const filter = buildFilterClause(filters, { assigneeColumn: '"attendees"', dateColumn: '"date"' });
  const tokenClause = buildSearchTokenClause("meeting-notes", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, date, project, title, attendees, content, actionItems, updatedAt
     FROM "MeetingNote"
     WHERE "deletedAt" IS NULL
       ${tokenClause.clause + companyClause + filter.clause}
     ORDER BY "updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams, filter.params),
  );

  return rows
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Meeting Notes",
        group: "Documentation",
        href: "/meeting-notes",
        code: codeFromId("MTG", Number(row.id)),
        label: normalize(row.title),
        sublabel: [normalize(row.project), normalize(row.date)].filter(Boolean).join(" · "),
        snippetSource: row.actionItems || row.content || row.attendees,
        fieldScores: [
          ["title", 100],
          ["project", 75],
          ["attendees", 40],
          ["content", 25],
          ["actionItems", 25],
          ["date", 20],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
