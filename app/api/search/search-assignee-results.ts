import { codeFromId } from "@/lib/utils";
import { getRoleLabel, normalizeRole } from "@/lib/roles";
import { buildSearchTokenClause } from "@/lib/search-index";
import { buildResult, extractExactId, normalize, queryFirst, queryRows, type Row, type SearchResult } from "./search-helpers";
export async function getAssigneeResults(query: string, companyClause: string, companyParams: unknown[]) {
  const exactId = extractExactId(query, "ASS");
  if (exactId !== null) {
    const exactRow = await queryFirst<Row>(
      `SELECT id, name, role, email, '' as skills, 'active' as status, "updatedAt"
       FROM "User"
       WHERE id = CAST(? AS INTEGER)${companyClause}
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      [exactId, ...companyParams],
    );
    if (exactRow) {
      if (normalizeRole(String(exactRow.role ?? "")) === "admin") return [];
      const exactItem = buildResult({
        row: exactRow,
        query,
        type: "Assignees",
        group: "System Settings",
        href: "/assignees",
        code: codeFromId("ASS", Number(exactRow.id)),
        label: normalize(exactRow.name),
        sublabel: [getRoleLabel(String(exactRow.role ?? "")), normalize(exactRow.email), normalize(exactRow.status)].filter(Boolean).join(" · "),
        snippetSource: exactRow.skills,
        fieldScores: [
          ["name", 100],
          ["role", 65],
          ["email", 70],
          ["skills", 30],
          ["status", 25],
        ],
      });
      if (exactItem) return [exactItem];
    }
  }
  const tokenClause = buildSearchTokenClause("assignees", String(companyParams[0] ?? ""), query, "");
  const rows = await queryRows<Row>(
    `SELECT id, name, role, email, '' as skills, 'active' as status, "updatedAt"
     FROM "User"
     WHERE 1=1${tokenClause.clause}${companyClause}
     ORDER BY "updatedAt" DESC
     LIMIT 8`,
    tokenClause.params.concat(companyParams),
  );

  return rows
    .filter((row) => normalizeRole(String(row.role ?? "")) !== "admin")
    .map((row) =>
      buildResult({
        row,
        query,
        type: "Assignees",
        group: "System Settings",
        href: "/assignees",
        code: codeFromId("ASS", Number(row.id)),
        label: normalize(row.name),
        sublabel: [getRoleLabel(String(row.role ?? "")), normalize(row.email), normalize(row.status)].filter(Boolean).join(" · "),
        snippetSource: row.skills,
        fieldScores: [
          ["name", 100],
          ["role", 65],
          ["email", 70],
          ["skills", 30],
          ["status", 25],
        ],
      }),
    )
    .filter((item): item is SearchResult => Boolean(item));
}
