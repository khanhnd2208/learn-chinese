# Agent guide — Learn Chinese

Entry point for Cursor and other coding agents. Read this file first; load domain docs only when needed.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4
- PostgreSQL (Prisma 7) — content, SRS, reports
- MongoDB — NextAuth users/sessions
- Path alias: `@/` → `src/`
- Dev port: **3001**

## Domain map

| Domain | Entry points | When to read |
|--------|--------------|--------------|
| **SRS** | `cnSrsService.ts`, `src/config/constants.ts` | Intervals, enrollment, due channels |
| **Practice** | `generateQuestions.ts`, `practiceTaxonomy.ts`, `coreQuestionTypes.ts`, `cnPracticeService.ts` | 7 core question types, 3 SRS channels |
| **Sets / Excel** | `cnSetService.ts`, `cnExcelService.ts` | Import/export, set CRUD |
| **Auth / Admin** | `src/lib/auth.ts`, `src/app/api/admin/` | Roles, import CMS |
| **Content** | `cnContentService.ts`, `prisma/seed-data/content.ts` | Published words/hanzi |

## Quality commands

```bash
npm run quality          # test + lint + build
npm test                 # all Vitest unit tests
npm run typecheck        # tsc --noEmit
```

## Conventions

- Business logic: `src/services/chinese/`
- Unit tests: `src/lib/__tests__/`
- Mock Prisma only in service-layer tests (`vi.mock('@/lib/prisma')`)
- API responses: `{ ok: true, ... }` or `{ ok: false, error: string }` via helpers in `src/lib/api.ts`

## Do not load unless needed

Large files — avoid reading whole file unless the task requires it:

| File | Why |
|------|-----|
| `TEST_SCENARIOS.md` | Redirect only — use `docs/testing/` |
| `docs/testing/*.md` | Manual QA — load the domain file you need |
| `DESIGN.md` | UI tokens — only for component/styling work |
| `prisma/seed-data/content.ts` | Huge seed — use `contentCoverageAudit.test.ts` as index |

## Scoped Cursor rules

Rules in `.cursor/rules/` auto-attach by file glob:

- `project-core.mdc` — always on
- `srs-practice.mdc` — SRS + practice services
- `api-routes.mdc` — `src/app/api/**`
- `ui-components.mdc` — components and pages

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
