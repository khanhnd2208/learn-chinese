# Deploy lên VPS

## Yêu cầu server

- Node.js 20+
- PostgreSQL (nội dung từ vựng + SRS)
- MongoDB (NextAuth users/sessions)
- Nginx/Caddy reverse proxy + HTTPS
- Domain trỏ về VPS (cập nhật Google OAuth redirect URI)

## Lần đầu trên VPS

```bash
git clone <repo-url> /var/www/learn-chinese
cd /var/www/learn-chinese
cp .env.example .env.local
# Chỉnh DATABASE_URL, MONGODB_URI, AUTH_SECRET, NEXTAUTH_URL, Google OAuth, ADMIN_EMAILS

npm ci
npx prisma migrate deploy
npm run db:seed
npm run build
```

Chạy production:

```bash
npm start   # port 3001
# hoặc PM2:
pm2 start npm --name learn-chinese -- start
pm2 save
```

## Cập nhật (mỗi lần deploy)

```bash
cd /var/www/learn-chinese
git pull
./scripts/deploy.sh
pm2 restart learn-chinese
```

## Database — migrations bắt buộc (2026-06-18)

Sau khi pull, `deploy.sh` chạy `prisma migrate deploy`. Cần có trên prod:

- `20260618200000_srs_pedagogy_improvements` — channel intro, mark-known, sticking point, answer source
- `20260618300000_srs_set_activation` — `CnWordSet.srsActive` + backfill bộ có progress

## Database — SRS features trước đó

Các tính năng **ôn tập tự do** và **/review/stats** **không cần migration mới**. Chỉ dùng bảng có sẵn:

- `CnWordProgress` — lịch lặp SRS đa kênh
- `CnAnswerLog` — log từng câu + lịch sử phiên (gom theo thời gian)

Đảm bảo migration `20260618100000_add_srs_channel_columns` đã apply trên prod.

### DB đã tạo bằng `db push` (baseline)

Nếu DB prod đã có schema từ `prisma db push` trước đó:

```bash
npx prisma migrate resolve --applied 20260617100000_init
npx prisma migrate resolve --applied 20260618100000_add_srs_channel_columns
npx prisma migrate deploy   # kỳ vọng: already up to date
```

## Env production

| Biến | Ghi chú |
|------|---------|
| `NEXTAUTH_URL` | URL public, vd. `https://chinese.yourdomain.com` |
| `AUTH_TRUST_HOST` | `true` sau reverse proxy |
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGODB_URI` | MongoDB cho NextAuth |

## Kiểm tra sau deploy

1. `GET /api/review/stats` — trả stats (cần đăng nhập)
2. `/review` — làm 1 câu → **Dừng & lưu** → thấy summary
3. `/review/stats` — `reviewedToday` tăng
