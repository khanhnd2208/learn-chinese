# User Flow — Reports (Dashboard)

## Entry points

- Sidebar "Báo cáo học tập"
- Bottom nav "Báo cáo học tập"
- Post-review summary "Xem báo cáo"
- Home links

## User goal

Understand learning health: what's due, what's weak, which channels need work.

## Screen roles (G8)

| Screen | Role | Key metrics |
|--------|------|-------------|
| `/dashboard` (SRS tab) | SRS schedule + accuracy + errors | dueChannelsToday, channel rates, weak words |
| `/dashboard?tab=inferno` | Inferno performance | inferno stats |
| Home | Daily action driver | dueToday hero |

**No separate `/review/stats`** — consolidated into dashboard.

## Main path

1. Navigate to `/dashboard`
2. Default tab: SRS report (`SrsReportPanel`)
3. Sections:
   - **Lịch ôn SRS** — due, overdue, reviewed today
   - **Kho từ** — state distribution pipeline
   - **Tỉ lệ chính xác** — overall ring + 3 active channels (meaning, sound, sentence)
   - **Lỗi phổ biến** + **Từ cần chú ý**
   - **Hoạt động** — 14-day review chart
4. Switch to Inferno tab for drill stats
5. CTA "Luyện ngay" when due > 0

## Label corrections (G1–G5)

| Field | Correct label | Wrong label |
|-------|---------------|-------------|
| Set progress | Kênh ổn định | Tiến độ / mastered |
| setCount | Tổng bộ từ | Bộ từ đang học |
| dueChannelsToday | Đang đến hạn | (same as weak) |
| weakCount | Cần chú ý | (confused with due) |
| sentenceRate | Sắp ra mắt (if channel inactive in review) | Active channel row |

## Error paths

| State | UX |
|-------|-----|
| Loading | Skeleton stat grid |
| No SRS data | EmptyState — enable SRS |
| API error | ErrorState + retry |

## Exit points

- `/review` (CTA)
- `/words/[id]` (weak word chips)
- `/sets`

## Success signal

- User identifies weak channel and starts targeted practice/review
