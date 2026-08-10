import type { SearchResult, SearchResultGroup, SearchScope, SearchScopeOption } from "./global-search-types";

export const SEARCH_SCOPES: Array<SearchScopeOption> = [
 { value:"all", label:"All" },
 { value:"test-plans", label:"Test Plans" },
 { value:"test-suites", label:"Test Suites" },
 { value:"test-cases", label:"Test Cases" },
 { value:"bugs", label:"Bugs" },
 { value:"tasks", label:"Tasks" },
 { value:"test-sessions", label:"Test Sessions" },
 { value:"meeting-notes", label:"Meeting Notes" },
 { value:"sprints", label:"Sprints" },
 { value:"deployments", label:"Deployment Log" },
 { value:"assignees", label:"Assignees" },
 { value:"users", label:"Users" },
 { value:"activity", label:"Activity" },
];

export const RECENTS_KEY ="aksora:global-search:recent";
export const SCOPE_KEY ="aksora:global-search:scope";
export const RECENT_LIMIT = 5;

export function readStringArray(raw: string | null) {
 try {
  const value = raw ? JSON.parse(raw) : [];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
 } catch {
  return [];
 }
}

export function groupResults(results: SearchResult[]) {
 const grouped = new Map<string, SearchResult[]>();
 for (const result of results) {
  const bucket = grouped.get(result.group) ?? [];
  bucket.push(result);
  grouped.set(result.group, bucket);
 }
 return Array.from(grouped.entries()).map(([group, items]) => ({
  group,
  items: items.sort((a, b) => b.score - a.score || a.type.localeCompare(b.type) || a.label.localeCompare(b.label)),
 })) satisfies SearchResultGroup[];
}

export function buildSearchParams(input: {
 query: string;
 scope: SearchScope;
 status: string;
 assignee: string;
 from: string;
 to: string;
}) {
 const params = new URLSearchParams({ q: input.query, scope: input.scope });
 if (input.status.trim()) params.set("status", input.status.trim());
 if (input.assignee.trim()) params.set("assignee", input.assignee.trim());
 if (input.from) params.set("from", input.from);
 if (input.to) params.set("to", input.to);
 return params;
}
