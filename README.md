# Aksora — One Team. One Flow.

Aksora is the modern workspace for engineering teams. Plan sprints, execute test sessions, track bugs and tasks, run standups, and auto-generate weekly reports — in one integrated app. No more spreadsheets, scattered docs, or context-switching between five tools.

Built by [Akusara Digital](https://akusaradigital.com).

## What Aksora Does (Function → Benefit)

| Capability | Benefit |
|-----------|---------|
| **Test planning & suites** | Organize scenarios into reusable plans/suites linked to sprints. Launch ready in minutes, not months. |
| **Test case library** | Preconditions, steps, expected results, Excel import. Reuse across releases — no re-typing. |
| **Execution sessions** | Run sessions, record pass/fail/blocked live. Pass rates per cycle, instantly. |
| **Bug tracking** | Severity, priority, assignee, evidence. Full lifecycle open → verified. |
| **Tasks & sprint board** | Kanban, sprint planning, role-based statuses. Dev + QA stay in sync. |
| **Dashboard & reports** | Quality health score, burndown, heatmaps, weekly digest — generated automatically. |
| **Standup & meeting notes** | Capture daily syncs and decisions in one place. |
| **Activity audit** | Every create/edit/delete logged with full traceability. |

**Roles:** superadmin · admin · fe · be · fullstack · qa · pm · ai

## Stack

Next.js 16 (App Router, Turbopack) · Tailwind v4 · `@phosphor-icons/react` · PostgreSQL (Docker lokal + Neon prod) · `pg` (lokal) / `@neondatabase/serverless` (Neon)

## Local Setup

1. Copy `.env.example` to `.env`
2. Set `AUTH_SECRET`
3. Set `DATABASE_URL` (Postgres). Leave empty only for SQLite-based local dev.
4. Seed local data: `pnpm db:seed:local`
5. Start: `pnpm dev`

## Quality Checks

```bash
pnpm test        # vitest
pnpm precheck    # eslint + tsc --noEmit + next build
pnpm ci:check    # test + precheck (same as GitHub Actions)
```

Run these before any release.

## Local Login

Use the email/password printed by the seed script (default admin: the seed output). Login is email + password only.

## Versioning

- Every push to `main` MUST bump the `version` in `package.json` (semver). See `AGENTS.md`.
- Don't push unless asked.

## Notes

- Prod uses Neon/Postgres. Local uses Postgres (Docker) unless `DATABASE_URL` is empty (undo SQLite).
- Maintenance routes (`sql-run`, `reset-db`) are disabled by default; explicit env flags required.
- `AUTH_SECRET` must be non-empty.