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
2. Test tung mode: `core_vocab`, `listening`, `sentence_usage`, `smart_mixed`.
   - Ky vong: mode chi sinh 6 loai core; sentence chi khi example verified; neu sentence chua unlock thi fallback core/listening.
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
   - Ky vong: chi (tu, meaning) due; listening/pinyin chua due cho den khi meaningIntervalIdx >= 1.
2. Tu moi tra loi dung `hanzi_to_meaning`.
   - Ky vong: meaningTotal +1, meaningIntervalIdx 1, state learning, due 1 ngay; sau do listening/pinyin co the due.
3. Tu moi tra loi sai `audio_to_meaning` (lan dau tren kenh nghe, sau ramp).
   - Ky vong: listeningTotal +1, listeningDueAt +30 phut, chi (tu, listening) bi cooldown.
4. Lan sai thu 2 tren cung kenh.
   - Ky vong: ve floor 1 ngay (heavy lapse).
5. Kenh rate thap nhung chua het interval Leitner.
   - Ky vong: KHONG due som (khong con weak bypass theo lifetime rate).
6. Cau production dung `translate_sentence` voi confidence cao.
7. Sai nhe o interval cao.
   - Ky vong: lui 1 bac, khong reset ve 10 phut.
8. Sai nang `sai_nghia`, `quen_hanzi`, `nghe_khong_ra` (lan 2+ tren kenh).
   - Ky vong: ve floor 1 ngay.
9. Meaning dat familiar.
   - Ky vong: sentence va hanzi channels unlock trong review/practice.
10. `/review` khi co due channels.
   - Ky vong: dueToday dem theo word x channel, moi word toi da 2 channel trong mot session.
11. `/review` khi khong co due.
   - Ky vong: hien "Khong co tu can on hom nay".
12. Tu mastered.
   - Ky vong: smart mixed uu tien listening/sentence/hanzi, khong lap lai core vocab qua nhieu.
13. Tu intro (meaningTotal=0).
   - Ky vong: khong gap hanzi_from_meaning, audio_to_pinyin_typed, translate_sentence trong smart mixed/review.
14. Review khong sinh radical_pick, char_components, translate_sentence mac dinh.
15. audio_to_pinyin_typed chap nhan xuexi (tone_missing) la dung mem.
16. Mark-known can qua 3 cau kiem tra nhanh (>=2/3 dung).

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
