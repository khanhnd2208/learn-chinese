# Ke hoach test he thong Learn Chinese

Ngay ra soat: 2026-06-18

Pham vi: app Next.js hoc tu vung tieng Trung, Google Auth, Prisma/PostgreSQL, MongoDB Auth.js, bo tu, practice engine 12 dang cau hoi, SRS da kenh, dashboard, Hanzi Lab, admin import CSV/XLSX.

Muc tieu deploy-ready:

- Moi import/export Excel phai map ro rang vao Prisma schema, khong ghi du lieu mo ho.
- File import phai co preview, validate, canh bao, va khong publish neu co loi nghiem trong.
- Export phai du de doi chieu/restore: content, sets, items, progress, logs neu can.
- Moi user case chinh phai co ky vong UI, API, database, va rollback/error handling.

## Tinh trang hien tai

- Unit test hien co: `npm test` pass 6 file, 51 test.
- Lint hien co: `npm run lint` fail voi 3 loi va 7 warning.
- Loi can xu ly truoc khi release:
  - `src/components/chinese/QuestionRenderer.tsx`: React Hook `useEffect` dang duoc goi sau nhanh return som `if (!q) return null`.
  - `src/components/ui/ThemeToggle.tsx`: rule React compiler bao `setMounted(true)` dong bo trong effect.
  - `src/lib/chinese/useSpeech.ts`: rule React compiler bao `setSupported(true)` dong bo trong effect.

## P0 - Smoke test bat buoc truoc release

### Auth va phan quyen

1. Chua dang nhap vao `/`, `/sets`, `/review`, `/dashboard`, `/hanzi-lab`, `/practice/{setId}`, `/words/{id}`.
   - Ky vong: bi chuyen ve `/login`.
2. Chua dang nhap goi API `/api/sets`, `/api/dashboard`, `/api/review`, `/api/lookup`.
   - Ky vong: JSON `{ ok: false, error: "Unauthorized" }`, HTTP 401.
3. Dang nhap bang user thuong vao `/admin`.
   - Ky vong: bi chuyen ve `/`, API `/api/admin/import` tra 403.
4. Dang nhap bang admin trong `ADMIN_EMAILS` vao `/admin`.
   - Ky vong: xem duoc man import, GET `/api/admin/import` tra danh sach tu da publish.
5. Da dang nhap vao `/login`.
   - Ky vong: bi chuyen ve `/`.

### Khoi tao du lieu va trang chu

1. User moi lan dau vao `/sets`.
   - Ky vong: tu dong tao demo starter sets, khong tao trung khi refresh/vao lai.
2. Trang chu `/` sau khi co demo data.
   - Ky vong: hien due today, so bo tu, tu yeu, listening rate; 3 bo tu gan nhat co link dung.
3. DB chua co content published.
   - Ky vong: app khong crash; tao HSK set bao loi ro rang; practice bao khong co cau hoi.

### Tao va quan ly bo tu

1. Tao bo tu manual voi title hop le va cac term co trong DB: `我`, `你`, `学生`, `老师`.
   - Ky vong: tao thanh cong, redirect `/sets/{id}`, item co word data, progress moi duoc tao.
2. Tao bo tu voi term trung, co khoang trang: ` 学生 `, `学生`, `老 师`.
   - Ky vong: normalize/deduplicate dung; khong tao item trung.
3. Tao bo tu voi term khong co DB: `不存在`.
   - Ky vong: tao item pending, coverage bao pending, khong crash.
4. Tao bo tu rong, title rong, hoac hon 200 term.
   - Ky vong: bi chan voi loi validation ro rang.
5. Tao HSK 1 bang nut "Them HSK 1".
   - Ky vong: tao bo tu tu published HSK 1; neu DB thieu HSK 1 thi tra loi "Chua co tu HSK 1".
6. Sua title/description bo tu.
   - Ky vong: cap nhat, refresh van giu du lieu.
7. Xoa bo tu.
   - Ky vong: set va items bi xoa; progress cua word khong bi xoa nham neu word con o set khac.
8. Nhan ban bo tu.
   - Ky vong: tao set moi ten co "(ban sao)", items giong set goc, khong duplicate progress loi.
9. Them term vao set da co san.
   - Ky vong: upsert item, khong trung rawTerm, cap nhat `updatedAt`.
10. Xoa item khoi set.
    - Ky vong: item bien mat, refresh khong quay lai.
11. Chuyen item sang set khac.
    - Ky vong: item sang set dich; neu set dich da co rawTerm thi item nguon bi xoa, khong tao trung.
12. Thu thao tac set cua user A bang user B qua API.
    - Ky vong: GET/PATCH/DELETE/duplicate/items deu 404 hoac fail, khong lo du lieu.

### Practice engine va submit

1. Vao `/practice/{setId}?mode=smart_mixed`.
   - Ky vong: co toi da 20 cau, cau hoi co prompt/options/correctAnswer dung, nut thoat quay lai set.
2. Test tung mode: `core_vocab`, `listening`, `sentence_usage`, `hanzi_memory`.
   - Ky vong: mode chi sinh nhom cau phu hop; neu kenh sentence/hanzi chua unlock thi fallback core/listening, khong crash.
3. Set chi co 1 tu nhung DB co distractor fallback.
   - Ky vong: MCQ van co it nhat 2 options.
4. Set chi gom pending terms/word khong du du lieu.
   - Ky vong: API practice tra 404 "Khong co tu nao co du du lieu de luyen"; UI hien loi.
5. Tra loi dung MCQ.
   - Ky vong: feedback "Dung!", cau tiep theo sau delay, submit summary dung total/correct/byType.
6. Tra loi sai MCQ.
   - Ky vong: feedback hien dap an, summary them weakWords, answer log co errorType suy luan.
7. Cau typed `translate_sentence`/`sentence_order`.
   - Ky vong: dung chi khi text trim khop exact `correctAnswer`; can test dau cau, khoang trang, full-width punctuation, pinyin co dau.
8. Bam "Bo qua".
   - Ky vong: tinh sai, submit co correct=false.
9. Submit batch rong, thieu `wordId`, sai `questionType`, sai `errorType`, hon 200 items.
   - Ky vong: 400, khong ghi progress/log.
10. Submit wordId khong ton tai.
    - Ky vong: 400 "Mot hoac nhieu wordId khong hop le", khong ghi partial.
11. Submit nhieu item cung mot wordId trong mot batch.
    - Ky vong: progress cong tuan tu, totals/correct tang dung.
12. Goi submit qua 60 lan/phut/user.
    - Ky vong: 429, cac route khac khong bi anh huong.

### SRS va review

1. Tu moi tra loi dung `hanzi_to_meaning`.
   - Ky vong: meaningTotal +1, meaningIntervalIdx 1, state learning, due 1 ngay.
2. Tu moi tra loi sai `audio_to_meaning`.
   - Ky vong: listeningTotal +1, state weak, interval floor 1 ngay, error `nghe_khong_ra`.
3. Cau production dung `translate_sentence` voi confidence cao.
   - Ky vong: nhay 2 bac interval.
4. Sai nhe o interval cao.
   - Ky vong: lui 1 bac, khong reset ve 10 phut.
5. Sai nang `sai_nghia`, `quen_hanzi`, `nghe_khong_ra`.
   - Ky vong: ve floor 1 ngay.
6. Meaning dat familiar.
   - Ky vong: sentence va hanzi channels unlock trong review/practice.
7. `/review` khi co due channels.
   - Ky vong: dueToday dem theo word x channel, moi word toi da 2 channel trong mot session.
8. `/review` khi khong co due.
   - Ky vong: hien "Khong co tu can on hom nay".
9. Tu mastered.
   - Ky vong: smart mixed uu tien listening/sentence/hanzi, khong lap lai core vocab qua nhieu.

### Dashboard

1. User chua co progress/log.
   - Ky vong: tat ca rate = 0, suggestion mac dinh, khong chia 0.
2. User co weak/learning/mastered.
   - Ky vong: setCount, wordsLearned, wordsMastered, weakCount dung.
3. Co answer logs sai nhieu loai.
   - Ky vong: topErrors sap xep giam dan, label tieng Viet dung.
4. Dashboard sau khi lam practice va submit.
   - Ky vong: rate theo channel va dueToday thay doi phu hop.

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

### Admin import

1. Preview CSV words hop le.
   - Ky vong: hien so dong hop le, errors=0, nut Publish enable.
2. Publish words hop le.
   - Ky vong: upsert word, word chars, example, pattern; list published refresh.
3. Preview Hanzi CSV hop le co `similar_group`.
   - Ky vong: tao preview dung components/radical/group key.
4. Publish hanzi hop le.
   - Ky vong: upsert hanzi va similar group dung.
5. File thieu required columns: words thieu simplified/pinyin/meaning_vi; hanzi thieu char.
   - Ky vong: preview co errors, Publish disabled, publish API tu choi neu co errors.
6. File trung simplified/char trong cung file.
   - Ky vong: warning va bo qua dong trung.
7. File `.txt`, file >2MB, file >500 rows, content-type khong multipart.
   - Ky vong: API tra 400 dung message.
8. Import word co `hsk_level` khong phai so.
   - Ky vong: hskLevel = null, khong crash.
9. Import lai cung word/hanzi voi du lieu moi.
   - Ky vong: upsert cap nhat, xoa va tao lai chars/examples/patterns dung.

### Excel import/export content va set tu

Hien trang can luu y: code hien co da doc `.xlsx/.xls` cho admin content import, nhung chua co export Excel va chua co import/export Excel rieng cho user word sets. Cac test duoi day la chuan can dat truoc khi deploy tinh nang import/export hoan chinh.

1. Template Excel content words dung schema.
   - Sheet `words` gom cot: `simplified`, `pinyin`, `han_viet`, `meaning_vi`, `part_of_speech`, `mnemonic_vi`, `hsk_level`, `example_hanzi`, `example_pinyin`, `example_meaning_vi`, `pattern_template`, `pattern_samples`, `chars`, `status`.
   - Map DB: `CnWord`, `CnWordChar`, `CnExample`, `CnSentencePattern`.
   - Ky vong: import preview doc dung cot snake_case va camelCase tuong duong; publish tao/cap nhat dung cac bang lien quan.
2. Template Excel hanzi dung schema.
   - Sheet `hanzi` gom cot: `char`, `pinyin`, `han_viet`, `meaning_vi`, `components`, `radical`, `mnemonic_vi`, `similar_group`, `status`.
   - Map DB: `CnHanzi`, `CnSimilarGroup`.
   - Ky vong: `components` tach bang `|` hoac `,`; `similar_group` upsert group va gan `similarGroupId`.
3. Template Excel user sets dung schema.
   - Sheet `sets`: `set_key`, `title`, `description`, `source`.
   - Sheet `set_items`: `set_key`, `raw_term`, `word_simplified`.
   - Map DB: `CnWordSet`, `CnWordSetItem`; `userId` lay tu session, khong lay tu file.
   - Ky vong: user chi import vao tai khoan cua minh; `word_simplified` resolve sang `CnWord.id`; neu khong co word thi `wordId=null`, item van pending.
4. Template Excel progress neu co restore tien do.
   - Sheet `progress`: `word_simplified`, `state`, `due_at`, `interval_idx`, `last_reviewed_at`, `meaning_correct`, `meaning_total`, `listening_correct`, `listening_total`, `pinyin_correct`, `pinyin_total`, `sentence_correct`, `sentence_total`, `char_correct`, `char_total`, `meaning_due_at`, `meaning_interval_idx`, `listening_due_at`, `listening_interval_idx`, `pinyin_due_at`, `pinyin_interval_idx`, `sentence_due_at`, `sentence_interval_idx`, `hanzi_due_at`, `hanzi_interval_idx`.
   - Map DB: `CnWordProgress`; unique key phai la `(userId, wordId)`.
   - Ky vong: enum `state` chi nhan `new/learning/weak/familiar/strong/mastered`; date ISO hop le; totals khong am; correct <= total.
5. Template Excel answer logs neu co audit/export lich su.
   - Sheet `answer_logs`: `word_simplified`, `question_type`, `error_type`, `correct`, `created_at`.
   - Map DB: `CnAnswerLog`.
   - Ky vong: `question_type` va `error_type` dung enum; neu `correct=true` thi `error_type` rong/null.
6. Export admin content full.
   - Ky vong: file `.xlsx` co sheet `words`, `hanzi`, `similar_groups`; import lai vao DB trong moi truong test tao cung du lieu logic, khong mat chars/examples/patterns.
7. Export user data.
   - Ky vong: file `.xlsx` chi gom data cua user hien tai: `sets`, `set_items`, `progress`, `answer_logs`; khong co `userId` cua user khac.
8. Round-trip content export -> import.
   - Buoc: export content, xoa DB test, import lai file do.
   - Ky vong: so luong words/hanzi/groups, unique keys, relation word-char, examples, patterns khop truoc/sau.
9. Round-trip user sets export -> import tai user moi.
   - Buoc: user A export sets, user B import.
   - Ky vong: tao set/item cho user B, khong copy `userId` A; progress/log chi import neu user chon restore progress.
10. Import Excel co nhieu sheet nhung thieu sheet bat buoc.
    - Ky vong: preview fail co message ro sheet/cot thieu; khong publish partial.
11. Import Excel co cot du thua.
    - Ky vong: bo qua cot du thua nhung hien warning, khong crash.
12. Import Excel co hang trong giua file.
    - Ky vong: bo qua row trong hoac bao warning theo row; khong lam lech row number trong errors.
13. Import Excel co formula, rich text, merged cells.
    - Ky vong: chi lay gia tri da tinh trong cell; merged cells khong duoc coi la nhieu row hop le; preview bao loi neu cot required rong.
14. Import Excel co Unicode tieng Trung, pinyin co dau, tieng Viet co dau.
    - Ky vong: giu nguyen encoding sau import/export; khong mat dau tieng Viet/pinyin.
15. Import content word voi `chars` khong ton tai trong sheet hanzi/DB.
    - Ky vong mong muon: tao `CnHanzi` draft placeholder hoac bao warning ro. Neu auto-create thi status theo row va phai test Hanzi Lab khong crash.
16. Import content word voi example khong chua `simplified`.
    - Ky vong: preview warning vi `fill_sentence` se khong sinh cau; publish chi cho phep neu admin xac nhan.
17. Import pattern samples sai format.
    - Ky vong: preview warning/error cho tung sample khong theo `hanzi|pinyin|meaningVi`; khong ghi JSON samples loi.
18. Import duplicate key giua file va DB.
    - Ky vong: preview hien "update existing"; publish upsert dung, khong tao duplicate do unique `simplified/char/key`.
19. Import user set vuot `MAX_CN_TERMS_PER_SET`.
    - Ky vong: fail theo tung set, khong tao partial set vuot gioi han.
20. Import user set co duplicate `raw_term` trong cung set.
    - Ky vong: dedupe theo `normalizeTerm`, preview warning; DB giu unique `(setId, rawTerm)`.
21. Export sau khi import user set.
    - Ky vong: file export phan anh dung title, description, source, item order/terms, pending terms.
22. File `.xlsx` lon gan gioi han 2MB va 500 rows.
    - Ky vong: import trong thoi gian chap nhan duoc; >2MB hoac >500 rows bi chan truoc publish.
23. Import dang publish thi mat ket noi/trang bi reload.
    - Ky vong mong muon: publish dung transaction hoac idempotent; retry khong tao duplicate/khong de relation mo coi.
24. Export khi DB rat lon.
    - Ky vong: co pagination/stream hoac gioi han ro; khong out-of-memory server.

## P1 - Test bien va on dinh

1. Query `/api/practice/{setId}?count=-1`, `count=0`, `count=9999`, `count=abc`.
   - Ky vong mong muon: clamp ve khoang an toan hoac 400. Hien tai route chua clamp, can test de phat hien memory/perf issue.
2. Query `/api/review?limit=-1`, `limit=0`, `limit=9999`, `limit=abc`.
   - Ky vong mong muon: clamp ve khoang an toan hoac 400. Hien tai chua clamp.
3. Lookup 200 terms, 201 terms, string chi co whitespace, term co dau cach trong noi bo.
   - Ky vong: 200 OK voi 200; 201 bi chan; whitespace bi chan; noi bo normalize trong create set.
4. Speech synthesis khong supported hoac browser block autoplay.
   - Ky vong: nut nghe lai khong lam crash; audio question van lam duoc.
5. Network/API fail o create set, practice submit, review, dashboard, admin import.
   - Ky vong: UI hien loi/empty state ro rang, khong treo loading vo han.
6. Mobile viewport 375px va desktop 1440px cho home, sets, set detail, practice, review, dashboard, admin.
   - Ky vong: text khong tran, nut khong chong len nhau, card khong vo layout.
7. Nhieu tab cung submit cung word.
   - Ky vong mong muon: khong mat update progress. Can test canh tranh transaction vi hien tai doc progress roi update co the co race.
8. User co hang tram set, moi set hang tram item.
   - Ky vong: listUserSets khong qua cham. Code hien tai co note N+1/count scan nen can performance test.
9. Rate limit multi-instance.
   - Ky vong prod multi-instance can Redis; hien tai in-memory chi dung 1 instance.
10. Long answer/prompt/meaningVi/pinyin trong content.
    - Ky vong UI khong vo layout; options MCQ van doc duoc.

## User cases can test truoc deploy

### UC01 - Hoc vien moi hoan toan

1. Dang nhap lan dau.
2. Vao `/sets`, demo auto-seed duoc tao.
3. Mo bo tu dau tien, xem word detail, vao practice smart mixed.
4. Lam 5 cau, co dung/sai/skip, submit.
5. Vao dashboard va review.
   - Ky vong: khong co trang nao crash; progress, weak words, dueToday cap nhat.

### UC02 - Hoc vien tu tao bo tu tu bai hoc tren lop

1. Tao set manual bang copy danh sach term co trung lap, khoang trang, pending term.
2. Xem coverage, tao set.
3. Them term moi, xoa term pending, chuyen term sang set khac.
4. Export set ra Excel, import lai vao user test khac.
   - Ky vong: set/item dung, pending terms duoc giu, khong lo du lieu user goc.

### UC03 - Hoc vien on SRS hang ngay

1. Co progress weak/learning/familiar/mastered.
2. Vao review, lam het cau due.
3. Refresh review va dashboard.
4. Quay lai sau khi sua thoi gian due trong DB test.
   - Ky vong: due theo tung channel, moi word khong qua 2 channel/session, mastered khong bi downgrade sai.

### UC04 - Hoc vien chi luyen nghe

1. Vao `/listening`, chon set.
2. Browser co speech synthesis va browser khong co speech synthesis.
3. Lam audio_to_hanzi/audio_to_meaning/audio_to_pinyin.
   - Ky vong: audio button khong crash, submit cap nhat listening channel.

### UC05 - Hoc vien dung Hanzi Lab de hoc chu kho

1. Nhap `折磨`, `请, 情, 清, 晴`, va term khong co DB.
2. Mo word detail tu Hanzi Lab neu co.
   - Ky vong: hien char components/radical/similar group dung; unknown term co empty state.

### UC06 - Admin cap nhat content bang Excel

1. Admin tai template.
2. Import preview words/hanzi hop le.
3. Sua mot word dang co, them example/pattern, them similar group.
4. Publish, export content, import lai tren DB test.
   - Ky vong: relation va unique keys dung schema; round-trip khong mat data.

### UC07 - Admin import file loi

1. File thieu cot bat buoc.
2. File co duplicate rows, enum status sai, hsk_level sai, pattern_samples sai format.
3. File qua size/qua rows/sai extension.
   - Ky vong: preview bao loi theo row; publish disabled; DB khong doi voi loi nghiem trong.

### UC08 - Nhieu user song song

1. User A va B cung tao set co cung rawTerm.
2. A xoa/duplicate/move item trong set cua A.
3. B goi API bang id set/item cua A.
4. A va B cung submit practice cho cung global word.
   - Ky vong: data set/progress/log tach theo `userId`; B khong doc/sua duoc set A.

### UC09 - User co du lieu lon

1. Tao 200 sets x 200 items cho mot user test.
2. Vao home, sets, dashboard, review.
3. Export user data.
   - Ky vong: response time trong muc chap nhan; khong timeout/out-of-memory; neu cham phai co gioi han/pagination.

### UC10 - Deploy production smoke

1. Chay migrate deploy tren DB moi.
2. Seed content.
3. Dang nhap Google OAuth production URL.
4. Tao set, practice, submit, review, import admin, export Excel.
5. Restart server, vao lai cac trang.
   - Ky vong: session/cookies dung domain, DB persistent, khong phu thuoc cache memory ngoai rate limit.

## P2 - De xuat bo sung automated tests

1. API integration tests voi DB test rieng:
   - Auth 401/403.
   - CRUD sets/items/duplicate/move/delete.
   - Practice session 404 khi khong du data.
   - Submit transaction rollback khi wordId sai.
   - Review due channels theo word x channel.
2. Component tests:
   - `QuestionRenderer` voi questions rong/doi questions giua chung.
   - MCQ answer, typed answer, skip, audio question khong speech support.
   - SetManage add/remove/move/duplicate error states.
3. E2E Playwright:
   - Login mock/session, seed DB, tao set, practice, submit, review, dashboard.
   - Admin import preview/publish bang file mau trong `public/samples`.
   - Mobile responsive screenshots cho cac trang chinh.
4. Static data audit mo rong:
   - Tat ca examples co chua simplified neu dung cho fill_sentence.
   - Tat ca pattern samples parse duoc `hanzi|pinyin|meaningVi`.
   - Khong co duplicate simplified/char trong seed/import.
5. Performance tests:
   - 1 user co 200 sets x 200 items.
   - 10.000 progress rows cho review/dashboard.
   - Import 500 rows CSV/XLSX.
6. Excel contract tests:
   - Tao workbook mau tu schema, parse lai, so sanh voi DTO preview.
   - Export workbook tu DB fixture, import lai DB rong, so sanh counts va unique keys.
   - Validate formulas/merged cells/Unicode/empty rows.
7. Multi-user isolation tests:
   - User A/B CRUD sets cung rawTerm.
   - User B khong truy cap duoc set/item/progress/log cua A.
   - Export cua A khong chua du lieu B.

## Cac loi tiem nang nen uu tien sua

1. `QuestionRenderer` vi pham Rules of Hooks: co the gay bug khi `questions` rong roi co du lieu sau render.
2. `count` va `limit` tren practice/review chua duoc validate/clamp.
3. Submit SRS co nguy co lost update khi hai request dong thoi cho cung `userId, wordId`.
4. Typed answer exact match qua chat, de tao false negative voi dau cau/khoang trang/variant.
5. `addTermsToSet` route khong dung `validateSetTerms`, nen co the gui batch qua lon hon 200 qua API items.
6. `getWordCard` dung `findUnique` kem `status` trong `where`; can xac nhan voi Prisma version/schema de tranh runtime error neu `status` khong thuoc unique selector.
7. Demo auto-seed trong `listUserSets` co side effect; can test idempotent va khong cham qua muc voi user moi.
8. Import publish xoa examples/patterns chi khi row moi co truong do; neu row cap nhat bo trong example/pattern, du lieu cu co the con lai.
9. Chua co export Excel; neu deploy yeu cau backup/doi chieu content thi day la feature gap.
10. Chua co import/export Excel cho user sets/progress; can thiet ke endpoint rieng va chi lay `userId` tu session.
11. Import content publish hien khong boc transaction toan bo file; neu fail giua chung co nguy co partial import.
12. Excel import hien doc sheet dau tien; neu dung workbook nhieu sheet can route theo sheet name va validate sheet bat buoc.
13. Export file lon can can nhac streaming/pagination de tranh out-of-memory.

## Deploy readiness checklist

1. Quality gates bat buoc xanh:
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`
2. Database:
   - Production dung `npx prisma migrate deploy`, khong dung `db push`.
   - Backup DB truoc khi import hang loat.
   - Co shadow DB rieng neu chay migrate diff trong CI.
3. Env/Auth:
   - `DATABASE_URL`, `MONGODB_URI`, `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`.
   - Google OAuth callback dung production domain.
   - Cookie/session test sau restart server.
4. Import/export:
   - Co template Excel versioned.
   - Co preview va dry-run truoc publish.
   - Publish dung transaction/idempotent.
   - Export chi theo quyen user/admin.
5. Security:
   - Tat ca API user data loc theo `userId`.
   - Admin-only import/export content.
   - Rate limit can Redis neu chay nhieu instance.
6. Observability:
   - Log loi import co request/user id, file name, row number; khong log noi dung nhay cam qua muc.
   - Monitor 500 rate, import failures, API latency cua dashboard/review/list sets.
7. Performance:
   - Review/dashboard/list sets can test voi data lon.
   - Neu cham, toi uu aggregate SQL cho due counts thay vi scan JS/N+1.
8. Rollback:
   - Co backup truoc import production.
   - Co cach revert content import gan nhat hoac restore tu export Excel/DB backup.
   - Migration rollback plan/toi thieu la backup + redeploy previous version.

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

## Lenh xac minh nen chay moi lan

```bash
npm test
npm run lint
npm run build
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
```

## Thu tu test thu cong khuyen nghi

1. Chay seed noi dung va dang nhap bang admin/user thuong.
2. Smoke auth/phan quyen.
3. Tao bo tu manual + HSK + pending terms.
4. Practice 4 mode + submit dung/sai/skip.
5. Review SRS sau submit.
6. Dashboard sau practice.
7. Hanzi Lab + word detail.
8. Admin import preview/publish voi file mau hop le va file loi.
9. Export/import Excel round-trip cho content va user sets.
10. Mobile/desktop visual pass.
11. Edge/performance pass cho count/limit, rate limit, bulk data.
12. Production smoke sau migrate deploy va restart server.
