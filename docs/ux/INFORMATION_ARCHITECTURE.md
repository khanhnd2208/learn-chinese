# Information Architecture — Learn Chinese

## Navigation model

| Platform | Model | Implementation |
|----------|-------|----------------|
| Desktop (≥768px) | Fixed left sidebar | `AppSidebar` — 240px, `MAIN_NAV` |
| Mobile (<768px) | Bottom tab bar + top app bar | `BottomNavBar` (5 tabs) + `TopAppBar` |
| Focus sessions | Chrome hidden | `AppShell.isFocusSession()` — `/review`, `/practice/*`, `/inferno` |

Config source: [`src/config/navigation.ts`](../../src/config/navigation.ts)

## Sitemap

```
Public
├── /login                    Google OAuth

Application (authenticated)
├── /                         Home — due count, onboarding, set cards
├── /sets                     Word set list
│   ├── /sets/[id]            Set detail — SRS toggle, words, practice
│   └── /sets/import          Excel + AI Smart Import
├── /shared-sets              Admin-published set library
├── /review                   SRS review session (focus mode)
├── /inferno                  Gamified mastery drill (focus mode)
├── /dashboard                Learning reports (SRS + Inferno tabs)
├── /practice/[setId]         Practice session (focus mode)
└── /words/[id]               Word detail card

Admin (role = admin)
├── /admin                    CMS — import, Hanzi AI, messages
└── /admin/analytics          Practice analytics

Dev (internal)
└── /dev/ui                   UI Lab — component showcase
```

## Desktop sidebar (`MAIN_NAV`)

| Label | Route | Icon |
|-------|-------|------|
| Trang chủ | `/` | home |
| Bộ từ | `/sets` | library_books |
| Chia sẻ bộ từ | `/shared-sets` | share |
| Luyện SRS | `/review` | history |
| Địa Ngục | `/inferno` | local_fire_department |
| Báo cáo học tập | `/dashboard` | trending_up |

CTA: **Học ngay** → `/review`

## Mobile bottom nav (`BOTTOM_NAV`)

| Tab | Route | Notes |
|-----|-------|-------|
| Trang chủ | `/` | |
| Luyện tập | `/sets` | Practice entry via sets |
| Luyện SRS | `/review` | Badge: due count |
| Địa Ngục | `/inferno` | |
| Báo cáo học tập | `/dashboard` | |

Not in bottom nav: shared-sets (reachable via sidebar desktop or top menu mobile).

## Screen roles (reports)

| Screen | Role | Audience |
|--------|------|----------|
| Home `/` | Daily action — due count, quick CTA | Daily driver |
| `/dashboard` | Deep diagnostic — errors, weak words, channel rates | Self-improvement |
| `/review` | Focus session — zero distraction | Active review |

## Navigation rules

1. One primary CTA per view (vermillion accent).
2. SRS due count visible in nav badge (`/review`).
3. Focus sessions hide chrome — user must always have exit path.
4. Deep links must work (`/practice/[setId]`, `/words/[id]`).
5. Back behavior: browser back + in-session "Dừng" button.
6. No duplicate paths to same function without reason.
7. Menu labels use Vietnamese user language.

## Content widths

| Type | Max width | Pages |
|------|-----------|-------|
| Narrow | 672px | Word card, practice, review |
| Medium | 896px | Sets, review stats |
| Wide | 1152px | Home, dashboard |

## Mental model (user-facing groups)

```
Học hôm nay     → Home, Review, Inferno
Bộ từ của tôi   → Sets, Import, Shared sets
Khám phá chữ    → Word card
Tiến bộ         → Dashboard
Tài khoản       → Login, logout (sidebar/footer)
```

Not organized by database tables (Users, Items, Records).
