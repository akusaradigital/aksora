---
name: qa-tools-website
description: "Use when working on the Aksora website. Guides the agent through repository review, feature planning, implementation, and validation for this Next.js + Prisma project."
---

# Aksora

This skill is for a full-stack engineer working on the `aksora` project to build, extend, and validate Aksora workspace features.

## When to use
- Adding or refining QA dashboard pages, reports, or module views
- Implementing new API endpoints, Prisma schema changes, or upload/import flows
- Reviewing repository structure and producing a safe implementation plan
- Validating local build, database changes, and UI consistency

## Workflow
1. Review the repository structure and current `app/`, `components/`, `lib/`, `prisma/`, and `api/` files.
2. Identify the feature request or bug and propose a minimal implementation plan.
3. Modify or add the necessary UI, backend, and database code.
4. Keep changes consistent with the project’s Next.js app router style and existing component patterns.
5. Validate by checking TypeScript, running build or dev server, and confirming the expected page/route behavior.

## Quality checklist
- Confirm the feature scope before implementation
- Reuse existing components and shared utilities where appropriate
- Keep UI consistent with existing styling and layout
- Apply Prisma schema changes only when the feature requires new data structure support
- Keep database/state changes aligned with the repository’s current data model conventions
- Summarize final changes clearly with file-level impact and next steps

## Example prompts
- "Add a QA dashboard page with charts and test case summaries."
- "Implement an import endpoint for daily QA logs and wire it into the upload UI."
- "Refactor the task module to add status filtering and improve the kanban board."
