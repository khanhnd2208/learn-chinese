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
npx prisma migrate resolve --applied 20260618400000_hanzi_ai_analysis   # nếu đã db push Hanzi AI tables
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
| `DEEPSEEK_API_KEY` | Hanzi AI | API key chỉ dùng ở server |
| `HANZI_AI_MODEL` | Hanzi AI | Mặc định `deepseek-v4-flash` |

## Cấu trúc

- `src/app/` — pages (không prefix `/chinese`)
- `src/app/api/` — API routes
- `src/services/chinese/` — business logic
- `prisma/` — PostgreSQL schema

## SRS — Leitner đa kênh (multi-track Leitner)

Hệ thống ôn **không phải SM-2/FSRS/Anki**. Mỗi từ có 5 kênh kỹ năng độc lập (nghĩa, nghe, pinyin, câu, hán tự), mỗi kênh leo thang interval riêng.

**Đơn vị lập lịch:** `(word, channel)` — số "ôn hôm nay" = số cặp từ×kênh đến hạn.

**Ramp kênh mới:** từ mới chỉ `(word, meaning)` due; `listening`/`pinyin` mở sau khi `meaningIntervalIdx ≥ 1`.

**Due eligibility:** theo lịch Leitner (`*DueAt`) + ramp + cooldown 30 phút lần sai đầu trên kênh — **không** kéo due sớm vì lifetime rate thấp.

**Priority review:** thuần theo kênh (overdue, weakness có sample weight) — không boost theo `p.state` cấp từ.

**Thang interval:** 10 phút → 1d → 3d → 7d → 14d → 30d → 90d → 180d → 360d.

**Khi sai:** lùi 1 bậc (lỗi nhẹ) hoặc về sàn 1 ngày (lỗi nặng) — lần sai đầu trên kênh: cooldown 30 phút.

**Nhảy 2 bậc:** `translate_sentence`, `hanzi_from_meaning` (free_recall/production) khi trả lời đúng.

**Mở khóa kênh:** `sentence` và `hanzi` mở khi kênh `meaning` đạt bậc familiar (idx ≥ 2).

**Perf:** `getDueChannels` / `countDueChannels` dùng SQL superset prefilter (`cnSrsDueQuery.ts`) rồi `isChannelDue` trong JS; `listUserSets` vẫn N+1 query dueCount mỗi set.

**Hạn chế đã biết (chưa xử lý):**
- Chữ đa âm/đa nghĩa: `CnWord.simplified` là unique — một chuỗi Hán = một mục từ
- Leech handling, cài đặt số câu/ngày
- Mastered chủ yếu từ câu nhận diện (MCQ); cần thêm câu gõ thật cho pinyin/hanzi
- Rate limit in-memory chỉ hiệu lực trên 1 instance; scale nhiều instance cần Redis

Logic: `src/services/chinese/cnSrsService.ts`, `src/lib/chinese/practiceTaxonomy.ts`.

## Hanzi AI

Hanzi Lab gọi DeepSeek qua server, cache theo từ và lưu nội dung theo revision. Generation chạy đồng bộ với hard deadline 50 giây và lease 75 giây. Kết quả AI không được ghi vào `CnWord`, `CnHanzi` hoặc SRS.

Production hiện yêu cầu một Node.js process (`PM2 instances=1`, `exec_mode=fork`) vì rate limit theo phút nằm trong memory. Daily quota, lease và circuit breaker nằm trong PostgreSQL.

### Harness & chất lượng code

```bash
npm run quality              # test + lint + build
npm run harness:hanzi        # golden cases offline (trust + pedagogy)
npm run harness:hanzi:report # báo cáo text; thêm --json cho agent/CI
npm run hanzi:batch          # live DeepSeek (thủ công, tốn API)
npm run hanzi:cache          # xem cache DB cho corpus 8 từ
```

Agent context: xem **[AGENTS.md](AGENTS.md)** và `.cursor/rules/`.

**Checklist khi đổi trust policy / registry version:**

1. Cập nhật golden cases trong `src/lib/harness/hanziGoldenCases.ts`
2. Chạy `npm run harness:hanzi` và `npm run harness:hanzi:report -- --json`
3. Admin reconcile: `POST /api/admin/hanzi-ai` action `reconcile` hoặc `mark_legacy_stale`
4. Cập nhật `AGENTS.md` nếu pipeline thay đổi

Manual QA theo domain: **[docs/testing/README.md](docs/testing/README.md)** (thay cho đọc toàn bộ `TEST_SCENARIOS.md`).

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
5. **Quality:** `npm run quality` (hoặc tách `npm test`, `npm run lint`, `npm run build`)
6. **Hanzi harness (nếu đổi trust policy):** `npm run harness:hanzi`
7. **Chạy:** `npm start` hoặc `./scripts/deploy.sh` + PM2
