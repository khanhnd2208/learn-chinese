# Manual testing — Learn Chinese

Index of domain-scoped QA scenarios. Load only the file you need (saves agent context tokens).

## Quality gates (automated)

```bash
npm run quality          # test + lint + build
npm run typecheck
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
```

## Domain scenarios

| Doc | Scope |
|-----|-------|
| [auth.md](auth.md) | Auth, permissions, homepage, demo seed |
| [srs-practice.md](srs-practice.md) | Sets, practice engine, SRS, dashboard |
| [excel-import.md](excel-import.md) | Admin CSV/XLSX, Excel round-trip |

## Full archive

Complete original spec (486 lines): [archive-full.md](archive-full.md)

Includes P1 edge cases, user cases UC01–UC10, P2 automation proposals, known bugs, deploy checklist.

## Recommended manual test order

1. Seed content and login as admin + regular user
2. [auth.md](auth.md) — smoke auth
3. [srs-practice.md](srs-practice.md) — create set, practice, review, dashboard
4. Word detail smoke test — open `/words/{id}` from a set and verify tabs render
5. [excel-import.md](excel-import.md) — admin import + Excel round-trip
6. Mobile/desktop visual pass
7. Production smoke after migrate deploy (see archive-full.md UC10)

## Agent note

Cursor agents: read `AGENTS.md` first. Load one `docs/testing/*.md` file per task domain — do not read `archive-full.md` unless doing full release QA.
