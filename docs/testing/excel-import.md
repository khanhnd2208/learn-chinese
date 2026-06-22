# Admin import & Excel

> Split from manual QA spec. See [README](README.md) for index.


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
