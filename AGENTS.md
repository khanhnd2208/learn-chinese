# Agent guide — Learn Chinese

Entry point for Cursor and other coding agents. Read this file first; load domain docs only when needed.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4
- PostgreSQL (Prisma 7) — content, SRS, Hanzi AI cache
- MongoDB — NextAuth users/sessions
- Path alias: `@/` → `src/`
- Dev port: **3001**

## Domain map

| Domain | Entry points | When to read |
|--------|--------------|--------------|
| **Hanzi AI** | `hanziAnalysisService.ts` → `hanziAnalysisValidator.ts` → `hanziTrustPolicy.ts` | Prompt, trust, cache, pedagogy |
| **SRS** | `cnSrsService.ts`, `src/config/constants.ts` | Intervals, enrollment, due channels |
| **Practice** | `generateQuestions.ts`, `practiceTaxonomy.ts`, `coreQuestionTypes.ts`, `cnPracticeService.ts` | 6 core question types, 4 SRS channels |
| **Sets / Excel** | `cnSetService.ts`, `cnExcelService.ts` | Import/export, set CRUD |
| **Auth / Admin** | `src/lib/auth.ts`, `src/app/api/admin/` | Roles, import CMS |
| **Content** | `cnContentService.ts`, `prisma/seed-data/content.ts` | Published words/hanzi |

## Hanzi AI pipeline

```
DeepSeekHanziProvider
  → hanziPreNormalize (term identity, structure aliases)
  → parseHanziDraft (Zod v1 draft)
  → validateHanziAnalysis (content + expert-fact conflicts)
  → applyHanziTrustPolicy (v2 publishable result)
  → cache in cnHanziAiAnalysis (by normalizedTerm)
```

Key versions live in `hanziTrustRegistry.ts`: `HANZI_TRUST_POLICY_VERSION`, `HANZI_TRUST_REGISTRY_VERSION`. Bump these when changing trust rules; run reconcile in admin.

## Quality commands

```bash
npm run quality          # test + lint + build
npm test                 # all Vitest unit tests
npm run typecheck        # tsc --noEmit
npm run harness:hanzi    # Hanzi golden-case suite (offline)
npx tsx scripts/hanzi-harness-report.ts --json   # structured harness report
```

Live DeepSeek eval (API cost, manual only):

```bash
npm run hanzi:batch      # batch live pipeline test
npm run hanzi:cache      # inspect DB cache for corpus terms
```

## Conventions

- Business logic: `src/services/chinese/`
- Unit tests: `src/lib/__tests__/`
- Offline harness: `src/lib/harness/`
- Mock Prisma only in service-layer tests (`vi.mock('@/lib/prisma')`)
- API responses: `{ ok: true, ... }` or `{ ok: false, error: string }` via helpers in `src/lib/api.ts`
- Do not write Hanzi AI output into `CnWord`, `CnHanzi`, or SRS tables

## Do not load unless needed

Large files — avoid reading whole file unless the task requires it:

| File | Why |
|------|-----|
| `TEST_SCENARIOS.md` | Redirect only — use `docs/testing/` |
| `docs/testing/*.md` | Manual QA — load the domain file you need |
| `DESIGN.md` | UI tokens — only for component/styling work |
| `prisma/seed-data/content.ts` | Huge seed — use `contentCoverageAudit.test.ts` as index |
| `hanziTrustRegistry.ts` full file | Curated claims — grep for specific char/term |

## Trust policy change checklist

When changing `HANZI_TRUST_POLICY_VERSION` or registry:

1. Update golden cases in `src/lib/harness/hanziGoldenCases.ts` if behavior changes
2. Run `npm run harness:hanzi` and `npx tsx scripts/hanzi-harness-report.ts --json`
3. Admin: `POST /api/admin/hanzi-ai` action `reconcile` or `mark_legacy_stale`
4. Document version bump in commit message

## Scoped Cursor rules

Rules in `.cursor/rules/` auto-attach by file glob:

- `project-core.mdc` — always on
- `hanzi-ai.mdc` — `src/services/chinese/hanziAi/**`
- `srs-practice.mdc` — SRS + practice services
- `api-routes.mdc` — `src/app/api/**`
- `ui-components.mdc` — components and pages
