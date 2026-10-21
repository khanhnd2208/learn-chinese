# Deploy lên VPS

## Cách deploy

App chạy theo chuẩn chung của VPS, quản lý trong repo hạ tầng riêng (không public).
Repo này không chứa cấu hình PM2 hay script deploy.

- Merge vào `main` → workflow **Quality** chạy → xanh thì **Deploy to VPS** tự chạy.
- Deploy tay: Actions → Deploy to VPS → Run workflow, hoặc `vps deploy learn-chinese` trên máy Mac.
- Workflow gửi `git archive` của commit lên VPS và gọi `/opt/vps/bin/app-deploy learn-chinese`:
  build trong `/var/www/learn-chinese/releases/<mới>` trong khi bản cũ vẫn chạy, `pg_dump` trước khi migrate,
  đổi `current`, gọi `GET /api/health`; không ra 200 thì tự quay về bản cũ.
- Các bước build riêng của app (prisma, migrate, purge demo sets, verify sample, build) nằm ở
  script build của app trên server. Test, lint, typecheck, audit chạy ở workflow Quality.
- Quay lại bản trước: `vps rollback learn-chinese`. Xem log: `vps logs learn-chinese`.

Trên VPS:

| Thứ | Đường dẫn |
|-----|-----------|
| Bản đang chạy | `/var/www/learn-chinese/current` → `releases/<ngày-giờ>-<sha>` |
| Biến môi trường | `/var/www/learn-chinese/shared/.env` (mode 600, user deploy) |
| Sao lưu DB trước deploy | `/var/www/learn-chinese/shared/db-backups/` |
| PM2 | `learn-chinese`, user `deploy`, chỉ nghe `127.0.0.1:3001` |

Secrets trong environment `production`: `VPS_HOST`, `VPS_SSH_KEY` (khoá CI có `restrict`), `VPS_KNOWN_HOSTS`.

## Yêu cầu server

- Node.js 20+
- PostgreSQL (nội dung từ vựng + SRS)
- MongoDB (NextAuth users/sessions)
- Nginx/Caddy reverse proxy + HTTPS
- Domain trỏ về VPS (cập nhật Google OAuth redirect URI)
- PM2 chạy **1 process fork** cho bản beta hiện tại

## Lần đầu trên một VPS mới

Làm theo runbook hạ tầng › "Thêm một app mới": tạo database, đặt
`/var/www/learn-chinese/shared/.env` (DATABASE_URL, MONGODB_URI, AUTH_SECRET, NEXTAUTH_URL,
Google OAuth, ADMIN_EMAILS), rồi `vps deploy learn-chinese --local`. Seed nội dung lần đầu:
`npm run db:seed` trong `current/`.

PM2 chạy **một process fork** (cấu hình nằm ở repo hạ tầng, không nằm trong repo này).
Không bật PM2 cluster mode cho phiên bản này. Giữ `instances=1`, `exec_mode=fork`; trước khi scale nhiều process phải chuyển rate limiter theo phút sang Redis/PostgreSQL.

Health check public: `GET /api/health` trả `200` khi app, PostgreSQL và MongoDB đều sẵn sàng; trả `503` khi dependency lỗi. Endpoint không trả secret hoặc stack trace.

## Cập nhật (mỗi lần deploy)

Merge vào `main`. Không `git pull` hay sửa code trực tiếp trên VPS.

Migration `20260622111541_add_ghi_chu_and_question_types` thêm cột `CnWord.ghiChu` và enum câu hỏi typed. Deploy chạy `prisma generate` + `prisma migrate deploy` tự động.

App không tự tạo bộ demo khi người học mới mở danh sách bộ từ. Script `scripts/provision-global-sample-sets.ts` chỉ chạy tay.

## Chuyển sang mô hình theo học bộ từ (2026-10-21)

Migration `20261021170900_set_enrollments` chỉ tạo bảng `CnSetEnrollment` rỗng. Hàng ôn tập và Thư viện chỉ đọc bộ từ có bản ghi theo học, nên **phải chép dữ liệu cũ sang ngay sau khi migrate**, nếu không người học cũ thấy hàng ôn trống. Script không nằm trong pipeline deploy, chạy tay trên VPS từ thư mục `current`:

```bash
npx tsx scripts/provision-global-sample-sets.ts        # chỉ khi chưa có bộ HSK admin
npx tsx scripts/migrate-set-enrollments.ts --dry-run   # xem enrollmentsToCreate, copiesToDelete
npx tsx scripts/migrate-set-enrollments.ts             # chạy thật, chạy lại được
```

- Bản chạy thật **xoá** các bản sao "(từ thư viện)" và bộ HSK mẫu cá nhân trùng bộ admin; tiến độ học của từ được giữ.
- Chạy `pg_dump` trước khi chạy bản thật nếu `app-deploy` chưa vừa làm.
- Kiểm tra sau: đăng nhập tài khoản cũ, `/review` còn từ đến hạn, `/library` có bộ đã theo.

Migration `20261021180200_answer_log_example_context`, `20261021181000_example_accepted_answers_disputes` và `20261021210000_example_source_hanzi` chỉ thêm cột có thể null, cột có mặc định hoặc bảng mới, deploy tự chạy.

## Database — migrations bắt buộc (2026-06-18)

Mỗi lần deploy chạy `prisma migrate deploy`. Cần có trên prod:

- `20260618200000_srs_pedagogy_improvements` — channel intro, mark-known, sticking point, answer source
- `20260618300000_srs_set_activation` — `CnWordSet.srsActive` + backfill bộ có progress

- `20260618400000_hanzi_ai_analysis` rồi `20260909100000_remove_hanzi_ai` — bảng Hanzi AI đã được gỡ

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
| `PG_POOL_MAX` | Tuỳ chọn; mặc định prod `5`, dev `10` |
| `PG_IDLE_TIMEOUT_MS` | Tuỳ chọn; mặc định `30000` |
| `MONGODB_URI` | MongoDB cho NextAuth |

## Kiểm tra sau deploy

1. `GET /api/health` — trả `200` và checks `postgres: ok`, `mongo: ok`
2. `GET /api/review/stats` — trả stats (cần đăng nhập)
3. `/review` — làm 1 câu → **Dừng & lưu** → thấy summary
4. `/review/stats` — `reviewedToday` tăng

Gate production local/CI:

```bash
npm run quality:prod
```
