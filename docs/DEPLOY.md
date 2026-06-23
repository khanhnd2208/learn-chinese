# Deploy lên VPS

## CI/CD (GitHub Actions)

Workflow `.github/workflows/deploy.yml` chạy khi push `main` hoặc **Run workflow** thủ công. Code được **rsync qua SSH** — VPS **không cần** `git pull` hay quyền đọc repo private.

### Secrets bắt buộc

Vào **Settings → Secrets and variables → Actions** (hoặc **Environments → production**, vì workflow dùng environment `production`):

| Secret | Mô tả |
|--------|--------|
| `VPS_HOST` | IP hoặc domain VPS |
| `VPS_USER` | User SSH (`root`, `deploy`, …) |
| `VPS_SSH_KEY` | Private key đầy đủ (cả dòng `-----BEGIN … KEY-----`) |

Tuỳ chọn: `VPS_SSH_PORT` (mặc định 22).

Tạo cặp key trên máy local, gắn **public key** vào VPS `~/.ssh/authorized_keys`, dán **private key** vào secret `VPS_SSH_KEY`:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/learn-chinese-deploy -N ""
ssh -i ~/.ssh/learn-chinese-deploy VPS_USER@VPS_HOST "echo OK"
```

Nếu thiếu secret, job fail sớm với message rõ ràng thay vì lỗi mơ hồ từ SCP.

`.env.local` trên VPS **không** bị ghi đè (rsync exclude).

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
# hoặc PM2 (bắt buộc instances=1, fork — xem ecosystem.config.cjs):
pm2 start ecosystem.config.cjs
pm2 save
```

Không bật PM2 cluster mode cho phiên bản này. Giữ `instances=1`, `exec_mode=fork`; trước khi scale nhiều process phải chuyển rate limiter theo phút sang Redis/PostgreSQL.

Reverse proxy cần cho phép request Hanzi AI chạy tối đa 90 giây. Với Nginx đặt `proxy_read_timeout 90s;` và `proxy_send_timeout 90s;`.

### Migration Hanzi AI (2026-06-18)

Migration `20260618400000_hanzi_ai_analysis` thêm bảng revision/job/quota và cột verification trên `CnWord`/`CnHanzi`.

```bash
npx prisma migrate deploy
```

Nếu DB dev đã `db push` trước khi có migration này:

```bash
npx prisma migrate resolve --applied 20260618400000_hanzi_ai_analysis
```

Retention raw provider output (30 ngày):

```bash
npx tsx scripts/purge-hanzi-ai-attempts.ts
```

Hoặc gọi `POST /api/admin/hanzi-ai` với `{ "action": "purge_attempts" }` (admin).

## Cập nhật (mỗi lần deploy)

```bash
cd /var/www/learn-chinese
git pull
./scripts/deploy.sh
pm2 restart learn-chinese
```

Migration `20260622111541_add_ghi_chu_and_question_types` thêm cột `CnWord.ghiChu` và enum câu hỏi typed. `deploy.sh` chạy `prisma migrate deploy` + `prisma generate` tự động.

Sau deploy lần đầu có feature sample sets, script cũng chạy `provision-global-sample-sets.ts` để backfill 3 bộ HSK1 cho user cũ.

## Database — migrations bắt buộc (2026-06-18)

Sau khi pull, `deploy.sh` chạy `prisma migrate deploy`. Cần có trên prod:

- `20260618200000_srs_pedagogy_improvements` — channel intro, mark-known, sticking point, answer source
- `20260618300000_srs_set_activation` — `CnWordSet.srsActive` + backfill bộ có progress

- `20260618400000_hanzi_ai_analysis` — Hanzi AI revisions, jobs, quota, provider health, verification fields

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
| `DEEPSEEK_API_KEY` | API key server-side cho Hanzi Lab |
| `HANZI_AI_MODEL` | Mặc định `deepseek-v4-flash` |

## Kiểm tra sau deploy

1. `GET /api/review/stats` — trả stats (cần đăng nhập)
2. `/review` — làm 1 câu → **Dừng & lưu** → thấy summary
3. `/review/stats` — `reviewedToday` tăng
