# Sets, practice, SRS, dashboard

> Split from manual QA spec. See [README](README.md) for index.

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
2. Test tung mode: `core_vocab`, `sound`, `sentence`, `smart_mixed`.
   - Ky vong: 7 dang cau. `listening`/`pinyin` cu map sang kenh am. Cau chi khi tu co example dien duoc.
3. Set chi co 1 tu nhung DB co distractor fallback.
   - Ky vong: MCQ van co it nhat 2 options.
4. Set chi gom pending terms/word khong du du lieu.
   - Ky vong: API practice tra 404 "Khong co tu nao co du du lieu de luyen"; UI hien loi.
5. Tra loi dung MCQ.
   - Ky vong: feedback "Dung!", cau tiep theo sau delay, submit summary dung total/correct/byType.
6. Tra loi sai MCQ.
   - Ky vong: feedback hien dap an, summary them weakWords, answer log co errorType suy luan.
7. Chi MCQ — khong con cau typed/sap xep.
   - Ky vong: dung/sai theo option hoac skip.
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

1. Tu moi enroll vao SRS.
   - Ky vong: 3 kenh nghia, am doc, cau. Cau chi due khi co example dien duoc.
2. Dung o bac MCQ1 (idx 0).
   - Ky vong: len idx 1, hen 1 ngay.
3. Sai o idx 0 hoac 1.
   - Ky vong: ve idx 0, hen 30 phut. UI: "Hen lai sau 30 phut".
4. Sai o idx 2 (Recall).
   - Ky vong: ve idx 1, hen 1 ngay.
5. Sai o idx 3 tro len (ke ca bac 30 ngay).
   - Ky vong: ve idx 2 (Recall), hen 1 ngay. Khong roi ve MCQ.
6. Mo goi y roi tra loi dung.
   - Ky vong: giu nguyen idx, hen 1 ngay, nhan "Dung (co goi y)". So cau dung khong tang.
7. Cau nghe `sound_to_hanzi`.
   - Ky vong: khong hien pinyin truoc khi tra loi neu may co TTS. "Hien pinyin" tinh la goi y.
8. Kenh rate thap nhung chua het interval.
   - Ky vong: KHONG due som.
9. Thang on.
   - Ky vong: 1, 1, 3, 7, 14, 30 ngay. 7 dang cau, khong con kenh listening/pinyin/hanzi rieng.
10. `/review` khi co due channels.
   - Ky vong: dueToday dem theo tu x kenh.
11. `/review` khi khong co due.
   - Ky vong: hien trang thai trong, khong co muc can on.

### SRS enrollment UX (bo tu)

1. Trang chi tiet bo tu — banner SRS khi bat/tat, toggle trong card rieng.
2. Panel quan ly (desktop) — banner giai thich add/xoa/chuyen anh huong SRS.
3. Them tu vao bo SRS-active.
   - Ky vong: thong bao "N tu vao hang doi SRS", tu xuat hien o /review.
4. Xoa tu exclusive khoi bo SRS-active.
   - Ky vong: confirm canh bao mat progress; sau xoa co thong bao.
5. Xoa tu con trong bo SRS khac.
   - Ky vong: confirm nhe hon, progress giu nguyen.
6. Chuyen tu tu bo SRS sang bo khong SRS (exclusive).
   - Ky vong: confirm canh bao mat progress.

### Dashboard

1. User chua co progress/log.
   - Ky vong: tat ca rate = 0, suggestion mac dinh, khong chia 0.
2. User co weak/learning/mastered.
   - Ky vong: setCount, wordsLearned, wordsMastered, weakCount dung.
3. Co answer logs sai nhieu loai.
   - Ky vong: topErrors sap xep giam dan, label tieng Viet dung.
4. Dashboard sau khi lam practice va submit.
   - Ky vong: rate theo channel va dueToday thay doi phu hop.
