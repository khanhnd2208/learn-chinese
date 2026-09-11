# User Flow — Inferno (Địa Ngục)

## Entry points

- Sidebar "Địa Ngục"
- Bottom nav "Địa Ngục"
- Home quick link

## User goal

Gamified mastery drill with score deltas — intensive review separate from SRS scheduling.

## Preconditions

- User logged in
- Minimum enrolled words threshold met (gate state if not)

## Main path

1. Navigate to `/inferno`
2. Focus mode activated
3. Gate check: enough SRS-active words
4. Load session via `GET /api/inferno`
5. Answer questions with score feedback (delta display)
6. Submit via `POST /api/inferno/submit`
7. Session summary with score changes
8. Stats available on `/dashboard?tab=inferno`

## Alternative paths

| Path | Trigger | Behavior |
|------|---------|----------|
| Gate blocked | Not enough words | EmptyState — "Cần thêm từ" + link sets |
| Exit mid-session | Dừng | Save partial progress |

## Error paths

| State | UX |
|-------|-----|
| Loading | Skeleton |
| Unauthenticated | Redirect `/login` (proxy must protect `/inferno`) |
| API error | ErrorState + retry |

## Exit points

- `/dashboard?tab=inferno`
- `/` home
- `/sets`

## Success signal

- Score delta visible per answer
- Session summary with total score change
- Inferno log recorded

## Recovery

- Retry on submit failure
- Re-enter for new session
