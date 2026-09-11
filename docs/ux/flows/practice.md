# User Flow — Practice Session

## Entry points

- `/sets` → PracticeModePicker on a set
- `/sets/[id]` → Study panel → practice mode
- Home set card → practice link
- `/words/[id]` → practice shortcuts

## User goal

Drill vocabulary in a set without affecting SRS schedule. Get instant feedback and session summary.

## Preconditions

- User logged in
- Set has ≥1 word
- Set belongs to user (or duplicated from shared)

## Main path

1. User selects set and practice mode (`?mode=meaning|sound|sentence|mixed`)
2. Navigate to `/practice/[setId]?mode=...`
3. AppShell enters focus mode (no nav chrome)
4. Load 20 questions via `GET /api/practice/[setId]`
5. For each question: render via `QuestionRenderer`
   - Show channel pill, progress, hanzi/audio prompt
   - User answers (MCQ or typed)
   - Instant feedback (correct/wrong + explanation)
6. Submit incrementally via `POST /api/practice/submit`
7. Session complete → `SessionSummaryCard` with score, weak words
8. Exit: "Trang chủ" / "Ôn lại" / word drill links

## Alternative paths

| Path | Trigger | Behavior |
|------|---------|----------|
| Single word drill | `?word=id` | Focused session on one word |
| Exit mid-session | "Dừng" button | Confirm if answers submitted; return to set |
| Mode change | Back to set detail | New session on re-entry |

## Error paths

| State | UX |
|-------|-----|
| Loading | Skeleton question card |
| Empty set | EmptyState — "Bộ từ chưa có từ" + link import |
| Network error | ErrorState + retry |
| Submit failure | Inline toast; keep local answer state |
| Session expired | Redirect to `/login` |

## Exit points

- Set detail `/sets/[id]`
- Home `/`
- Word card `/words/[id]`

## Success signal

- Session summary visible with score %
- Practice log recorded (no SRS schedule change)

## Recovery

- Retry failed submit without losing position
- "Ôn lại" starts new session with same mode
