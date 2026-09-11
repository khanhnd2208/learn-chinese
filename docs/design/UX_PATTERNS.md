# UX Patterns — States & Microcopy

Language: **Vietnamese** for all user-facing copy.

## State matrix (per data screen)

| State | Question | Pattern |
|-------|----------|---------|
| Initial | First open? | Show primary CTA or onboarding |
| Loading | Processing? | Skeleton matching layout |
| Empty | Nothing here? | EmptyState + next step CTA |
| Populated | Scannable? | Clear hierarchy, hanzi hero |
| Partial | Some failed? | Show loaded + inline error per section |
| Error | Recoverable? | ErrorState + retry |
| Offline | Can continue? | Banner + disable submit |
| Success | Confirmed? | Toast or summary card |
| Disabled | Why blocked? | Muted + tooltip/hint |
| Permission | Fix path? | Link to login or enable SRS |

## Empty states

| Screen | Title | CTA |
|--------|-------|-----|
| Sets list | Chưa có bộ từ | Import từ đầu tiên |
| Review | Không có mục cần ôn | Chọn bộ từ |
| Review (no SRS) | Chưa bật SRS | Vào Bộ từ |
| Dashboard | Chưa có dữ liệu SRS | Bật SRS trên bộ từ |
| Inferno gate | Cần thêm từ vựng | Thêm từ vào bộ |

## Error messages

| Bad | Good |
|-----|------|
| Something went wrong | Không thể tải phiên ôn. Thử lại hoặc quay về trang chủ. |
| Error 500 | Máy chủ đang bận. Tiến độ đã lưu vẫn an toàn. |
| Invalid input | Vui lòng nhập ít nhất 1 chữ Hán. |

## Success feedback

| Action | Pattern |
|--------|---------|
| Answer correct | Inline border success + "Đúng!" |
| Answer wrong | Inline border warning + đáp án |
| Session complete | Summary card "Ôn xong!" |
| Import success | Toast "Đã import X từ" |
| SRS toggle on | Toast "Đã bật SRS" |
| Copy link | Toast "Đã sao chép" |

## Button copy rules

- Start with verb: **Ôn ngay**, **Import từ**, **Thử lại**, **Dừng**
- Destructive: **Xóa bộ từ**, **Gỡ khỏi SRS**
- Loading: **Đang tải...** (disable button)

## Metric labels (canonical)

| Data field | UI label |
|------------|----------|
| dueChannelsToday / dueToday | Đang đến hạn / Cần ôn hôm nay |
| overdueCount | Trễ hạn |
| reviewedToday | Đã ôn hôm nay |
| weakCount | Cần chú ý |
| setCount | Tổng bộ từ |
| stableChannels | Kênh ổn định |
| maturePct | Đã thuộc vững |
| streak | X ngày liên tiếp |

## SRS explanation copy

> Hệ thống ôn dùng hộp Leitner đa kênh — mỗi từ qua 3 kỹ năng: nghĩa, âm đọc, câu. Không phải Anki/SM-2.

Unit: **1 mục = 1 từ × 1 kỹ năng**
