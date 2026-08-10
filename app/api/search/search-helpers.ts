import { db } from "@/lib/db";

export type SearchScope =
  | "all"
  | "tasks"
  | "bugs"
  | "test-plans"
  | "test-suites"
  | "test-cases"
  | "test-sessions"
  | "meeting-notes"
  | "sprints"
  | "assignees"
  | "users"
  | "deployments"
  | "activity";

export type SearchResult = {
  id: string;
  code: string;
  label: string;
  sublabel: string;
  href: string;
  type: string;
  group: string;
  snippet: string;
  score: number;
  matchedField: string;
};

export type Row = Record<string, unknown>;

export type SearchFilters = {
  status?: string;
  assignee?: string;
  from?: string;
  to?: string;
};

export const SCOPE_ALIASES: Record<string, SearchScope> = {
  all: "all",
  tasks: "tasks",
  bugs: "bugs",
  "test-plans": "test-plans",
  plans: "test-plans",
  "test-suites": "test-suites",
  suites: "test-suites",
  "test-cases": "test-cases",
  cases: "test-cases",
  "test-sessions": "test-sessions",
  sessions: "test-sessions",
  "meeting-notes": "meeting-notes",
  meetings: "meeting-notes",
  sprints: "sprints",
  assignees: "assignees",
  users: "users",
  deployments: "deployments",
  activity: "activity",
};

export const SCOPE_LABELS: Record<SearchScope, string> = {
  all: "All",
  tasks: "Tasks",
  bugs: "Bugs",
  "test-plans": "Test Plans",
  "test-suites": "Test Suites",
  "test-cases": "Test Cases",
  "test-sessions": "Test Sessions",
  "meeting-notes": "Meeting Notes",
  sprints: "Sprints",
  assignees: "Assignees",
  users: "Users",
  deployments: "Deployment Log",
  activity: "Activity",
};

export const SECTION_LABELS: Record<string, string> = {
  "Work Items": "Work Items",
  "Test Management": "Test Management",
  Documentation: "Documentation",
  "System Settings": "System Settings",
  Activity: "Activity",
};

export function normalize(value: unknown) {
  return String(value ?? "").trim();
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function getScope(input: string | null): SearchScope {
  const normalized = normalize(input).toLowerCase();
  return SCOPE_ALIASES[normalized] ?? "all";
}

export function scoreField(value: unknown, queryLower: string, weight: number) {
  const text = normalize(value).toLowerCase();
  if (!text) return 0;
  if (text === queryLower) return weight + 100;
  if (text.startsWith(queryLower)) return weight + 60;
  if (text.includes(queryLower)) return weight + 25;
  return 0;
}

export function makeSnippet(value: unknown, query: string) {
  const text = normalize(value);
  if (!text) return "";
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text.slice(0, 110);
  const lower = text.toLowerCase();
  const needle = trimmedQuery.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return text.slice(0, 110);
  const start = Math.max(0, index - 32);
  const end = Math.min(text.length, index + trimmedQuery.length + 48);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function buildResult({
  row,
  query,
  type,
  group,
  href,
  code,
  label,
  sublabel,
  snippetSource,
  fieldScores,
}: {
  row: Row;
  query: string;
  type: string;
  group: string;
  href: string;
  code: string;
  label: string;
  sublabel: string;
  snippetSource?: unknown;
  fieldScores: Array<[string, number]>;
}): SearchResult | null {
  const queryLower = query.toLowerCase();
  let bestScore = 0;
  let bestField = "";

  for (const [field, weight] of fieldScores) {
    const value = row[field];
    const score = scoreField(value, queryLower, weight);
    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }

  const codeScore = scoreField(code, queryLower, 130);
  if (codeScore > bestScore) {
    bestScore = codeScore;
    bestField = "code";
  }

  if (bestScore <= 0) return null;

  const snippet = makeSnippet(snippetSource, query) || makeSnippet(label, query) || makeSnippet(sublabel, query);
  return {
    id: `${type.toLowerCase().replace(/\s+/g, "-")}-${String(row.id ?? "")}`,
    code,
    label,
    sublabel,
    href,
    type,
    group,
    snippet,
    score: bestScore,
    matchedField: bestField || "label",
  };
}

export function buildSearchSql(columns: string[], companyClause: string, extraWhere = "") {
  const searchClause = columns.map((column) =>
    `POSITION(? IN LOWER(COALESCE(${column}, ''))) > 0`
  ).join(" OR ");
  return `WHERE (${searchClause})${extraWhere}${companyClause}`;
}

export async function queryRows<T extends Row>(sql: string, params: unknown[] = []) {
  try {
    return (await db.query(sql, params)) as T[];
  } catch (error) {
    console.error("Search query failed:", error);
    return [] as T[];
  }
}

export async function queryFirst<T extends Row>(sql: string, params: unknown[] = []) {
  const rows = await queryRows<T>(sql, params);
  return rows[0] ?? null;
}

export function mergeRowsById<T extends Row>(primaryRows: T[], secondaryRows: T[]) {
  const seenIds = new Set<string>();
  const mergedRows: T[] = [];
  for (const row of [...primaryRows, ...secondaryRows]) {
    const id = String(row.id ?? "");
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    mergedRows.push(row);
  }
  return mergedRows;
}

export function extractExactId(query: string, prefix: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(new RegExp(`^${prefix}[-\\s]?(\\d+)$`, "i"));
  return match ? Number(match[1]) : null;
}

export function buildFilterClause(
  filters: SearchFilters = {},
  config: { statusColumn?: string; assigneeColumn?: string; dateColumn?: string } = {},
) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const status = normalize(filters.status).toLowerCase();
  if (status && config.statusColumn) {
    clauses.push(`LOWER(COALESCE(${config.statusColumn}, '')) = ?`);
    params.push(status);
  }

  const assignee = normalize(filters.assignee).toLowerCase();
  if (assignee && config.assigneeColumn) {
    clauses.push(`LOWER(COALESCE(${config.assigneeColumn}, '')) = ?`);
    params.push(assignee);
  }

  const from = normalize(filters.from);
  if (from && config.dateColumn) {
    clauses.push(`date(${config.dateColumn}) >= date(?)`);
    params.push(from);
  }

  const to = normalize(filters.to);
  if (to && config.dateColumn) {
    clauses.push(`date(${config.dateColumn}) <= date(?)`);
    params.push(to);
  }

  return {
    clause: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
}
