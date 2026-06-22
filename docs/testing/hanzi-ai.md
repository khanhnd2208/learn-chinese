# Hanzi Lab & word detail

> Split from manual QA spec. See [README](README.md) for index.

### Hanzi Lab va chi tiet tu

1. Phan tich mot term co word full.
   - Ky vong: hien word card, chars, mnemonic, similar group neu co.
2. Phan tich char/term chi co hanzi, khong co word.
   - Ky vong: status `charsOnly`, khong crash.
3. Phan tich term khong co data.
   - Ky vong: status `none`, panel hien trang thai trong.
4. Nhap nhieu term ngan cach newline/comma, toi da 15.
   - Ky vong: tra dung so analyses, >15 bi chan ca UI va API.
5. Vao `/words/{id}` word published.
   - Ky vong: hien HanziCard, progress/channel mastery neu user co progress.
6. Vao `/words/{id}` word khong ton tai/draft.
   - Ky vong: 404.

## P0 — Hanzi AI smoke test
## P0 - Hanzi AI smoke test

### Phan tich va cache

1. Chua dang nhap goi `GET /api/hanzi/analysis?term=学习` hoac `POST /api/hanzi/analyze`.
   - Ky vong: 401 Unauthorized.
2. Dang nhap, term hop le `学习` (1-4 chu Han), lan dau `POST /api/hanzi/analyze`.
   - Ky vong: 200 ready hoac 202 generating + `Retry-After: 2`; khong ghi `CnWordProgress`/SRS.
3. Cung term, goi lai `GET /api/hanzi/analysis?term=学习`.
   - Ky vong: cache hit, khong tao job moi; GET khong mutate DB.
4. Term khong hop le: `学习中文`, co khoang trang, co so.
   - Ky vong: 400 validation.
5. Polling `GET /api/hanzi/analysis/[id]` khi generating.
   - Ky vong: 202 + Retry-After; client chi 1 timer, cleanup khi unmount.

### Quota, lease va failure

6. User thuong goi generate >5 lan/phut.
   - Ky vong: 429 rate limit.
7. User het daily quota (20 lan/ngay, timezone Asia/Ho_Chi_Minh).
   - Ky vong: 429, khong tao job.
8. Regenerate that bai khi da co ban ready.
   - Ky vong: `currentRevisionId` giu nguyen; chi job/candidate bi anh huong.
9. Accept candidate voi `expectedContentVersion` sai.
   - Ky vong: 409 STALE_CANDIDATE.

### Curated invalidation

10. Admin publish/import word hoac hanzi lien quan term dang co AI analysis.
    - Ky vong: reconcile trong cung transaction import; hard fact doi -> `needs_review`; chi all-fact doi -> van `ready` + soft stale tren GET.

### Admin governance

11. Admin xem list/detail, diff candidate, raw attempt output (plain text).
12. Admin block/unblock, edit revision, resolve report.
13. `POST /api/admin/hanzi-ai` action `purge_attempts` xoa attempt >30 ngay.

### Deploy

14. PM2 `instances=1`, `exec_mode=fork` (xem `ecosystem.config.cjs`).
15. Nginx `proxy_read_timeout 90s` cho route Hanzi AI.
16. VPS smoke: POST analyze, disconnect client @30s, poll -> job van complete (manual).
