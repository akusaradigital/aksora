import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/auth-core";
import {
  getActivityResults,
  getAssigneeResults,
  getBugResults,
  getDeploymentResults,
  getMeetingResults,
  getPlanResults,
  getSessionResults,
  getSprintResults,
  getSuiteResults,
  getTaskResults,
  getTestCaseResults,
  getUserResults,
} from "./search-query-builders";
import { getScope, SECTION_LABELS, SCOPE_LABELS, type SearchResult } from "./search-helpers";

type SearchCacheEntry = { expiresAt: number; payload: unknown };
const SEARCH_CACHE_KEY = "__aksora_search_cache";
const searchCache = (globalThis as any)[SEARCH_CACHE_KEY] ?? ((globalThis as any)[SEARCH_CACHE_KEY] = new Map<string, SearchCacheEntry>());

// Simple garbage collection to prevent memory leaks
function cleanupCache() {
  if (searchCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of searchCache.entries()) {
      if (value.expiresAt < now) searchCache.delete(key);
    }
    // If still too large, clear it entirely as a fallback
    if (searchCache.size > 1000) searchCache.clear();
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const scope = getScope(request.nextUrl.searchParams.get("scope"));
  const filters = {
    status: request.nextUrl.searchParams.get("status")?.trim() || "",
    assignee: request.nextUrl.searchParams.get("assignee")?.trim() || "",
    from: request.nextUrl.searchParams.get("from")?.trim() || "",
    to: request.nextUrl.searchParams.get("to")?.trim() || "",
  };
  const company = user.company || "";
  const isAdmin = isPlatformSuperAdmin(user.role, company);
  const companyClause = isAdmin ? "" : ` AND "company" = ?`;
  const companyParams = isAdmin ? [] : [company];
  const cacheKey = [
    company,
    isAdmin ? "admin" : "user",
    scope,
    q.toLowerCase(),
    filters.status.toLowerCase(),
    filters.assignee.toLowerCase(),
    filters.from,
    filters.to,
  ].join("|");
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" } });
  }

  const isAll = scope === "all";
  const selected = [
    isAll || scope === "tasks" ? getTaskResults(q, companyClause, companyParams, filters) : null,
    isAll || scope === "bugs" ? getBugResults(q, companyClause, companyParams, filters) : null,
    isAll || scope === "test-plans" ? getPlanResults(q, companyClause, companyParams, filters) : null,
    isAll || scope === "test-suites" ? getSuiteResults(q, companyClause, companyParams, filters) : null,
    isAll || scope === "test-cases" ? getTestCaseResults(q, companyClause, companyParams, filters) : null,
    isAll || scope === "assignees" ? getAssigneeResults(q, companyClause, companyParams) : null,
    isAll || scope === "users" ? getUserResults(q, companyClause, companyParams) : null,
    isAll || scope === "activity" ? getActivityResults(q, companyClause, companyParams, filters) : null,
  ].filter(Boolean) as Array<Promise<SearchResult[]>>;

  const coreArrays = await Promise.all(selected);
  let arrays: SearchResult[][] = coreArrays;

  if (isAll && q.length >= 4) {
    const coreResults = coreArrays.flat();
    if (coreResults.length < 12) {
      const secondaryArrays = await Promise.all([
        getSessionResults(q, companyClause, companyParams, filters),
        getMeetingResults(q, companyClause, companyParams, filters),
        getSprintResults(q, companyClause, companyParams, filters),
        getDeploymentResults(q, companyClause, companyParams, filters),
      ]);
      arrays = [...coreArrays, ...secondaryArrays];
    }
  }

  const results = arrays
    .flat()
    .sort((a, b) => b.score - a.score || a.group.localeCompare(b.group) || a.label.localeCompare(b.label))
    .slice(0, 24);

  const payload = {
    query: q,
    scope,
    scopeLabel: SCOPE_LABELS[scope] ?? "All",
    sectionLabels: SECTION_LABELS,
    results,
  };
  cleanupCache();
  searchCache.set(cacheKey, { payload, expiresAt: Date.now() + 15000 });
  return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" } });
}
