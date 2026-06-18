# Learn Chinese

App học từ vựng tiếng Trung độc lập — tách khỏi [toiladuykhanh.com](https://toiladuykhanh.com).

## Tính năng

- Tạo bộ từ (dán danh sách / HSK)
- Thẻ từ đa lớp (5 tab)
- Hanzi Lab (phân tích chữ, bộ thủ, mẹo nhớ)
- Luyện nghe (Web Speech zh-CN)
- Practice Engine (12 dạng bài)
- SRS ôn tập (Leitner đa kênh — 5 kỹ năng/từ)
- **Ôn tự do** — dừng bất cứ lúc nào, lưu từng câu
- **Tiến độ SRS** (`/review/stats`) — xem mục cần ôn / đã ôn hôm nay
- Dashboard lỗi & tiến bộ
- Admin CMS import CSV

## Chạy local

```bash
cd /Users/duykhanh/Documents/learn-chinese
cp .env.example .env.local
# Chỉnh DATABASE_URL, MONGODB_URI, Google OAuth, ADMIN_EMAILS

npm install
npx prisma db push          # dev nhanh (hoặc migrate dev)
npm run db:seed

npm run dev   # http://localhost:3001
```

### Migration (dev đã db push)

Nếu DB dev đã có cột SRS per-channel từ `db push`, đánh dấu migration bổ sung là đã apply:

```bash
npx prisma migrate resolve --applied 20260618100000_add_srs_channel_columns
```

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | Có | PostgreSQL — nội dung từ vựng, SRS |
| `MONGODB_URI` | Có | MongoDB — NextAuth users/sessions |
| `AUTH_SECRET` | Có | Secret NextAuth |
| `NEXTAUTH_URL` | Có | URL app (vd. `http://localhost:3001`) |
| `GOOGLE_CLIENT_ID` | Có | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Có | Google OAuth |
| `ADMIN_EMAILS` | Khuyến nghị | Email admin (CSV) — role admin khi đăng nhập |
| `AUTH_TRUST_HOST` | Prod | `true` khi deploy sau reverse proxy |

## Cấu trúc

- `src/app/` — pages (không prefix `/chinese`)
- `src/app/api/` — API routes
- `src/services/chinese/` — business logic
- `prisma/` — PostgreSQL schema

## SRS — Leitner đa kênh (multi-track Leitner)

Hệ thống ôn **không phải SM-2/FSRS/Anki**. Mỗi từ có 5 kênh kỹ năng độc lập (nghĩa, nghe, pinyin, câu, hán tự), mỗi kênh leo thang interval riêng.

**Đơn vị lập lịch:** `(word, channel)` — số "ôn hôm nay" = số cặp từ×kênh đến hạn.

**Thang interval:** 10 phút → 1d → 3d → 7d → 14d → 30d → 90d → 180d → 360d.

**Khi sai:** lùi 1 bậc (lỗi nhẹ) hoặc về sàn 1 ngày (lỗi nặng: quên nghĩa/hán tự/nghe không ra) — không reset về 10 phút.

**Nhảy 2 bậc:** chỉ với câu sản xuất (`translate_sentence`, `sentence_order`) khi trả lời đúng.

**Mở khóa kênh:** `sentence` và `hanzi` mở khi kênh `meaning` đạt bậc familiar (≥3 ngày).

**Perf đã biết:** `getDueChannels` / `countDueChannels` load toàn bộ progress user rồi lọc JS; `listUserSets` gọi `countDueAndWeak` mỗi set. Tối ưu aggregate SQL — deferred.

**Hạn chế đã biết (chưa xử lý):**
- Chữ đa âm/đa nghĩa: `CnWord.simplified` là unique — một chuỗi Hán = một mục từ
- Leech handling, cài đặt số câu/ngày
- Mastered chủ yếu từ câu nhận diện (MCQ); cần thêm câu gõ thật cho pinyin/hanzi
- Rate limit in-memory chỉ hiệu lực trên 1 instance; scale nhiều instance cần Redis

Logic: `src/services/chinese/cnSrsService.ts`, `src/lib/chinese/practiceTaxonomy.ts`.

## Demo auto-seed

User mới lần đầu mở danh sách bộ từ sẽ được tạo **bộ demo starter** (idempotent — chỉ khi user chưa có set nào). Hành vi chủ ý để có nội dung luyện ngay.

## Deploy

Xem **[docs/DEPLOY.md](docs/DEPLOY.md)** — checklist VPS, migration, baseline DB.

App chạy độc lập trên port **3001** (dev) hoặc subdomain riêng (vd. `han.learn.local` / `chinese.yourdomain.com`).

Không deploy cùng bundle với my-teaching-platform.

### Production checklist

1. **Env:** đặt đủ `DATABASE_URL`, `MONGODB_URI`, `AUTH_SECRET`, `NEXTAUTH_URL`, Google OAuth, `ADMIN_EMAILS`
2. **DB:** `npx prisma migrate deploy` (không dùng `db push` trên prod)
3. **Seed nội dung:** `npm run db:seed` (hoặc import admin CMS)
4. **Xác nhận schema:** `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code` (kỳ vọng: no diff; cần shadow DB — tự tạo `prisma_migrate_shadow` hoặc đặt `SHADOW_DATABASE_URL`)
5. **Build:** `npm run build`
6. **Test:** `npm test`
7. **Chạy:** `npm start` hoặc `./scripts/deploy.sh` + PM2
