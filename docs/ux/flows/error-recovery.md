# User Flow — Error Recovery

Cross-cutting error handling for all golden flows.

## Error categories

| Category | Example | UX pattern |
|----------|---------|------------|
| No data | Empty set, no SRS words | EmptyState + primary CTA |
| Network slow | API > 3s | Skeleton → spinner on action |
| Network lost | fetch failed | ErrorState + retry; preserve form input |
| Server error | 500 | ErrorState + "Thử lại" + support hint |
| Validation | Wrong answer | Inline feedback (not error page) |
| Permission | 401/403 | Redirect login or permission message |
| Session expired | Auth timeout | Redirect `/login` with return URL |
| Conflict | Duplicate submit | Idempotent retry; no double count |
| Mid-flow exit | User closes tab | Persist submitted items only |

## Empty state template

```
[Icon]
{What is empty}
{Why — one sentence}
[Primary CTA]
[Secondary link — optional]
```

Example:
> Chưa có bộ từ.
> Tạo bộ từ sau buổi học để bắt đầu ôn SRS.
> [Import từ đầu tiên]

## Error state template

```
[Icon warning]
{What happened}
{Is data safe?}
[Thử lại]  [Quay lại]
```

Example:
> Không thể tải phiên ôn.
> Tiến độ đã lưu vẫn an toàn trên máy chủ.
> [Thử lại]  [Về trang chủ]

## Success feedback hierarchy

| Action size | Pattern |
|-------------|---------|
| Small (toggle, copy) | Button state change |
| Medium (save form) | Inline confirmation |
| Large (session end) | Summary card / page |
| Non-blocking confirm | Toast |

## Offline (PWA)

- Service worker caches app shell
- API calls show offline banner
- Queue not implemented — show clear "Cần kết nối mạng"

## Microcopy rules

- Vietnamese, short, no blame
- Buttons start with verb
- Errors include recovery action
- No "Something went wrong" without context
