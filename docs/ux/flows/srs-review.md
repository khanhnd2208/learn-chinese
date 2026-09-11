# User Flow — SRS Review

## Entry points

- Home due hero CTA "Ôn ngay"
- Sidebar CTA "Học ngay"
- Bottom nav "Luyện SRS" (badge shows due count)
- Dashboard link "Luyện ngay"

## User goal

Complete today's spaced-repetition queue across meaning, sound, and sentence channels.

## Preconditions

- User logged in
- ≥1 set with `srsActive = true`
- ≥1 channel due (or empty state)

## Main path

1. Navigate to `/review`
2. Focus mode — hide top/bottom nav
3. Optional briefing phase (due count, streak)
4. Load questions via `GET /api/review`
5. For each item (1 word × 1 channel):
   - Header: progress "Đã ôn X · Còn ~Y", correct/wrong counters
   - Channel pill (large, below header)
   - Question card via `QuestionRenderer`
   - Feedback + schedule label ("Ôn lại sau N ngày")
6. Submit via `POST /api/review/submit` (incremental)
7. Queue empty or user stops → `SessionSummaryCard`
8. CTAs: "Ôn tiếp" / "Xem báo cáo" / "Trang chủ"

## Alternative paths

| Path | Trigger | Behavior |
|------|---------|----------|
| Vocab manager | Header "≡" | Sheet/modal — manage SRS words |
| Stop session | "Dừng" | Save progress; confirm copy |
| Continue later | Exit mid-session | Progress persisted per channel |

## Error paths

| State | UX |
|-------|-----|
| No SRS-active sets | EmptyState — enable SRS on a set |
| No due items | Celebration empty — "Không có mục cần ôn" |
| Loading | Skeleton card center screen |
| Network error | ErrorState + retry; answers queued if safe |
| Permission denied | Redirect login |

## Metric clarity (G5, G6, G7)

- **Due today** = schedule axis (channels due now)
- **Weak count** = quality axis (separate from due)
- Progress bar: "Đã ôn X · Còn ~Y" with percentage
- Channel pill: large, centered below header

## Exit points

- `/dashboard` (reports)
- `/sets` (enable more SRS)
- `/` (home)

## Success signal

- Summary shows reviewed count + accuracy %
- `reviewedToday` incremented in stats API
- Schedule updated per channel

## Recovery

- Mid-session exit preserves submitted progress
- Retry on network failure for current question
