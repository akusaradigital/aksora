# Aksora - Agent Rules

**Aksora** (formerly QA Daily Hub) is the workspace for engineering teams: test planning, execution, bug tracking, tasks/sprints, standups, and auto-generated weekly reports — all in one app. Built by Akusara Digital. Brand: **Aksora — One Team. One Flow.** Site: `aksora.akusaraproject.my.id`. Company: `https://akusaradigital.com`.

## Versioning (REQUIRED)
- **Every push to aksora project MUST bump `version` in `package.json`** (semver `MAJOR.MINOR.PATCH`). Include the version change in the same commit, then push.
- Run `pnpm precheck` before any release push.

## Stack
Next.js 16.2 (App Router, Turbopack) · Tailwind v4 · `@phosphor-icons/react` (bold) · PostgreSQL (Docker lokal + Neon prod) via `lib/db.ts` · Driver: `pg` (lokal) / `@neondatabase/serverless` (Neon) · Roles: superadmin admin fe be fullstack qa pm ai

## File Placement

| Type | Location |
|------|----------|
| Feature component | `components/[domain]/` — create new folder if needed |
| Global hook | `hooks/` |
| Module-specific hook | `components/module/` (prefix `use-`) |
| Business logic | `lib/` |
| Page sub-component | co-locate in `app/[page]/` |
| **NEVER** put files flat in `components/` root | |

## Knowledge Graph / Graphify (MANDATORY)
- **MANDATORY**: Before fixing bugs, refactoring, or building new features, always consult `graphify-out/graph.json` or use `graphify query "<target>"` / `graphify-out/GRAPH_REPORT.md` first.
- Pinpoint the exact files, caller hierarchies, and dependencies to touch. Do NOT waste context tokens scanning random files — go straight to the point using the knowledge graph.

## Agent File Lookup

| Task | Check |
|------|-------|
| Module field | `lib/module-config-definitions.ts` → `lib/db-schema.ts` → form component |
| CRUD | `lib/data.ts` → `lib/data-helpers.ts` → `app/api/items/` |
| Dashboard | `lib/data-dashboard.ts` → `components/dashboard/` |
| Auth | `lib/auth.ts` → `lib/auth-core.ts` → `app/api/auth/` |
| Test management | `lib/test-management-data.ts` → `components/test-management/` |
| Search | `lib/search-index.ts` → `components/shared/search/` |
| Schema migration | `lib/db-schema.ts` → `lib/db-bootstrap.ts` |

## SQL (CRITICAL)
- Postgres only — no SQLite, no branching.
- Double-quote camelCase columns: `"createdAt"` `"updatedAt"` `"deletedAt"` `"startDate"` `"endDate"` `"sprintId"` `"testPlanId"` `"testSuiteId"` `"publicToken"` `"suggestedDev"` `"totalCases"` `"bugType"` `"relatedItems"` `"relatedFeature"` `"lastRunAt"` `"automationResult"` `"typeCase"` `"preCondition"` `"caseName"` `"testStep"` `"expectedResult"` `"actualResult"` `"actionItems"` `"entityType"` `"entityId"`
- Parameterized queries only. `toPostgresQuery()` converts `?`→`$n`.
- Guard empty dates: `COALESCE(col, '') != ''`. Return early on empty `IN (...)`.
- Schema changes: create tables → add columns → create indexes.

## Rules
1. Filter by `workspaceId` (unless superadmin). Log all CRUD via `logActivity()`.
2. Validate session on mutating routes. Zod validation from `lib/modules.ts`.
3. API: `{ data }` on success, `{ error: string }` + status on failure.
4. Navigation: `router.refresh()`, never `window.location.reload()`.
5. UI: Tailwind only, `@phosphor-icons/react` bold. Charts: `responsive-container.tsx`.
6. Dates: ISO 8601 stored, `date-fns` display, server UTC.
7. DB → client: `JSON.parse(JSON.stringify(data))`.
8. Max 400 lines/component, 600 lines/lib — split if larger.
9. New components MUST go in a domain folder. Create new folder for new features.
10. Code & comments in English.

## Do NOT (CRITICAL - STRICTLY ENFORCED)
- **NEVER git push or git commit unless explicitly and unambiguously requested with the exact words "commit" or "push". Slang, affirmations, or casual phrases (e.g., "gas", "gas semua", "lanjut", "oke", "mantap", "sip") MUST NEVER be interpreted as permission to push/commit.**
- **NEVER add a `Co-Authored-By` trailer (or any co-author credit) to commit messages.**
- Add packages without checking `package.json`.
- Add SQLite or `isPostgres` branching.
- Use `/test-case-management` — it's `/test-cases`.
- Generate `.md` spec files — implement directly.
- Run tests unless asked.
- Put files flat in `components/` root.
- Duplicate logic from `lib/data-helpers.ts` or `lib/utils.ts`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `antislop-ui.md`
- Copy & text: `antislop-copywriting.md`
- People: `antislop-human.md`
<!-- antislop:end -->
