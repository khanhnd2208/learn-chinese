# Kế hoạch: Câu điền từ công bằng

> Tài liệu cho Cursor thực hiện tuần tự từng task. Phạm vi: chỉ bản tiếng Trung.
> Viết ngày 2026-10-21, dựa trên code tại commit `a42c807`.
> Ưu tiên tuyệt đối: không làm hỏng và không mất dữ liệu đang chạy trên VPS.

Trạng thái: Phase 1–5 đã làm trên `main` (chưa push). Checklist tay ở cuối chưa chạy được trên trình duyệt vì trang yêu cầu đăng nhập Google.

## Nguyên tắc

1. Giữ dạng điền từ theo ngữ cảnh.
2. Nghĩa tiếng Việt của cả câu hiện sẵn, đầy đủ, không đục lỗ. Không phải gợi ý. Người học tắt được (`localStorage` `cn.sentence.showMeaningVi`).
3. Nghe cả câu là gợi ý duy nhất. Đúng sau khi nghe vẫn hiện "Đúng!" và giữ bậc (`hintUsed` trong `computeNextReview`). Pinyin ngữ cảnh đã đục lỗ không phải gợi ý.
4. Sai lần đầu, chưa dùng gợi ý, máy có audio hoặc có pinyin dự phòng: không gửi, tự phát câu (hoặc hiện pinyin từ đích), cho thử lại 1 lần. Sai lần 2 mới tính sai.
5. "Đáp án của tôi cũng đúng": giữ bậc, vào hàng chờ admin. Admin duyệt thì đáp án vào `acceptedAnswers`.
6. Câu có tỉ lệ đúng-không-nghe thấp hoặc nhiều kháng nghị được gắn cờ. Admin rút câu thì câu ra khỏi vòng hỏi và người bị trừ bậc được trả bậc.
7. Import sinh nghĩa Việt đầy đủ và không đổi ID câu ví dụ.

`isWordMastered` không cần sửa: đúng-có-gợi-ý không tăng idx.

## Quy tắc khi làm

Mỗi task một commit. Sau mỗi task: `npm test` và `npm run typecheck`. Cuối phase: `npm run quality`. Migration chỉ thêm cột nullable hoặc có default, hoặc bảng mới. Không `migrate reset`, không backfill ghi đè. Logic mới có test Vitest. Service test mock Prisma. UI mới dùng token ngữ nghĩa và primitive trong `src/components/ui/`.

## Phase 1 — Hiển thị và gợi ý (không đụng DB)

- 1.1 `fullMeaningViForExample`. Câu điền từ có `sentenceMeaningVi` đầy đủ và `sentenceAudioText = example.hanzi`.
- 1.2 Nghĩa Việt bật/tắt. Pinyin ngữ cảnh không tính gợi ý. "Nghe cả câu" tính gợi ý. Không TTS thì "Hiện pinyin từ cần điền". Ẩn HintPanel với câu điền từ.
- 1.3 `decideSentenceAttempt` → `accept | retry`. Item gửi `attempts: 1 | 2`.
- 1.4 Tiêu đề đúng luôn là "Đúng!". Dòng phụ nói rõ vì sao bậc được giữ.

## Phase 2 — Nền dữ liệu

- 2.1 `syncCanonicalExamples`: khớp canonical example theo hanzi NFC+trim, update nội dung, tạo câu mới, xoá câu không còn trong file. Không hạ `verified`, không đụng ví dụ của người học.
- 2.2 Migration `answer_log_example_context`: `CnAnswerLog.exampleId` (không FK), `channelIdxBefore`, `attempts`, `disputed`, `answer`. `exampleId` không thuộc từ hoặc không nhìn thấy thì ghi null, không loại cả lô.

## Phase 3 — Kháng nghị và đáp án chấp nhận

- 3.1 Migration `example_accepted_answers_disputes`: `CnExample.acceptedAnswers`, `qualityReviewedAt`, bảng `CnExampleDispute`. `CN_DISPUTES_PER_DAY = 10`.
- 3.2 Chấm đúng nếu khớp `correctAnswer` hoặc `acceptedAnswers`. MCQ không dùng các từ đó làm distractor.
- 3.3 Câu điền từ sai lần cuối chưa gửi cho đến khi rời câu. Bấm kháng nghị thì item mang `disputed: true` và server áp như đúng-có-gợi-ý, nhưng log vẫn `correct: false`.
- 3.4 Admin gom kháng nghị pending theo `(exampleId, answer)` tại `/admin/disputes`. Chấp nhận chỉ thêm vào `acceptedAnswers`, không sửa SRS.

## Phase 4 — Gắn cờ và trả bậc

- 4.1 `scoreExample`: lượt đầu mỗi người, cửa sổ 90 ngày, cờ khi đủ 8 lượt và clean rate dưới 0.4, hoặc 3 người kháng nghị.
- 4.2 `/admin/example-quality`: retire (`naturalnessStatus = flagged`), edit, accept-answers, dismiss.
- 4.3 Log review sai gần nhất, chưa disputed, có `channelIdxBefore`, chưa có log câu sau đó: trả `sentenceIntervalIdx`, giảm heavy lapse, đánh dấu log để không trả hai lần.

## Phase 5 — Nguồn nội dung

- 5.1 0 chỗ trống ở câu Việt thì hợp lệ. 1 chỗ trống giữ hành vi cũ. Từ 2 chỗ trống thì lỗi. Dưới 4 từ là cảnh báo, không chặn.
- 5.2 Prompt và sheet hướng dẫn yêu cầu câu Việt đầy đủ, tự kiểm "che từ đích", không đổi số cột TSV.
- 5.3 Rule `srs-practice.mdc` và `docs/testing/srs-practice.md`.

## Ngoài phạm vi

Không viết lại schema Lexeme/Probe, không gộp HHT/Inferno, không thay Web Speech, không sửa các lỗi đã ghi riêng: `wrongCount` Inferno, thứ tự distractor sau `shuffle`, P2002 khi gửi song song, rule `hanzi-ai.mdc` trỏ thư mục không còn.

## Checklist nghiệm thu

- [x] `npm run quality` qua sau Phase 1, 2, 3, 4. Phase 5 chạy lại ở commit tài liệu.
- [ ] Nghĩa Việt đầy đủ; tắt nghĩa được nhớ; bật/tắt không đổi chấm.
- [ ] Pinyin ngữ cảnh rồi đúng → lên bậc.
- [ ] Nghe cả câu rồi đúng → "Đúng!", giữ bậc, gặp lại sau 1 ngày.
- [ ] Sai lần đầu → nghe và thử lại; đúng lần 2 giữ bậc; sai lần 2 là sai.
- [ ] Không TTS → "Hiện pinyin từ cần điền".
- [ ] Câu điền từ không còn HintPanel.
- [ ] "Đáp án của tôi cũng đúng" không tụt bậc; admin thấy hàng chờ.
- [ ] Admin chấp nhận → lần sau đúng hoàn toàn và lên bậc.
- [ ] Câu gắn cờ hiện ở "Câu cần sửa"; retire rút câu và trả bậc.
- [ ] Import lại không đổi ID ví dụ và không mất `acceptedAnswers`.
- [ ] Excel cũ (`[BLANK]` ở câu Việt) và Excel mới đều import được.
- [ ] `prisma migrate deploy` trên bản sao DB production: không lỗi, số dòng `CnWordProgress` / `CnAnswerLog` / `CnExample` không đổi. Chưa chạy. Không migrate production từ máy này.

## Ghi chú khi thực hiện

Code khác mô tả ở các điểm sau. Cách làm là cách gần ý định nhất.

- Helper API nằm ở `src/lib/apiUtils.ts` (`apiSuccess`, `apiError`, `withAdmin`), không phải `src/lib/api.ts`. Body là `{ ok: true, data }`.
- `blankMeaningViExample` đã bị xoá sau task 1.1 vì không còn chỗ dùng.
- Card nhận `audioAvailable = !speechReady || supported` trong lúc phát hiện giọng, để nút pinyin dự phòng không nháy. Quyết định tự phát khi thử lại vẫn dùng `speechReady && supported`. `speak()` trả `false` thì không tính gợi ý.
- Không có TTS: thông báo thử lại là "Chưa khớp — xem pinyin rồi thử lại nhé". Dòng giữ bậc có bản pinyin. `sentenceHintKind` nhớ `audio` hoặc `pinyin`; nếu cả hai thì audio thắng.
- Chỉ thử lại khi có TTS hoặc có pinyin. Không có cả hai thì lần sai đầu bị chấm ngay.
- Tuỳ chọn hiện nghĩa dùng `useSyncExternalStore`. Không dùng effect để đọc `localStorage`, vì lint cấm set state trong effect.
- `SentencePromptCard` giữ `card-paper` và nút nhỏ sẵn có. Nút kháng nghị và trang admin mới dùng `Button` / `Card`. Link trên trang admin cũ dùng `btn-secondary` cho cùng họ với trang đó.
- Log HHT và Inferno cũng ghi `answer` của câu điền từ, để thống kê đáp án sai đọc được mọi nguồn. `channelIdxBefore` chỉ có ở review.
- `CnExampleDTO.acceptedAnswers` là optional để fixture cũ vẫn typecheck. Chỗ tạo DTO gán `[]`.
- Import lại không ghi `acceptedAnswers`, nên không xoá đáp án đã duyệt. `verified` không bị hạ xuống `auto`.
- Hai migration được tạo bằng `prisma migrate diff` rồi `migrate deploy`, không dùng `migrate dev`. Đã áp trên DB local. Không áp lên production.
- Đóng tab trước khi request kịp gửi có thể mất một câu sai đang chờ. Đúng như ghi chú của kế hoạch.
- Hàng chờ admin tải mọi kháng nghị pending rồi gom và cắt 50 dòng trong JS.
- Bộ đếm heavy lapse trên màn hình vẫn tăng khi câu điền từ hiện sai, kể cả khi người học kháng nghị sau đó. Database không tăng.
- `CnExample` không có `updatedAt`. Thống kê sau khi sửa chỉ tính log sau `qualityReviewedAt`. Edit, accept-answers và dismiss đặt mốc này. Retire không đặt, để câu vẫn nằm trong danh sách gắn cờ.
- Hàm trả bậc được commit trước trang admin vì trang gọi hàm đó.
- Không có helper tính lại `isStickingPoint`. `refreshStickingPoint` dùng đúng ngưỡng `CN_STICKING_POINT_HEAVY_LAPSES`. `syncProgressRollup` tách ba dòng cộng dồn due/state/idx mà `applyPracticeItem` đã dùng; hành vi chấm thường không đổi.
- Một log câu sau đó của cùng người và cùng từ, kể cả câu khác, thì không trả bậc.
- Sửa câu xoá `meaningViTemplate` khi nghĩa Việt mới không còn `__`, để export không giữ template đục lỗ cũ.
- Cảnh báo câu Việt dưới 4 từ có `level: 'warning'` và không chặn import. Ô bị loại có `level: 'error'`.
- `formatFillExampleCell` thêm đối số template. Lời gọi cũ ba đối số vẫn xuất đúng phần Việt được truyền vào.
- Checklist tay chưa bấm được trên trình duyệt: `/review` chuyển sang `/login` (Google). Không có phiên đăng nhập trong trình duyệt của Cursor.

## Sửa sau rà soát (2026-10-21)

- Pinyin câu ví dụ trong DB không đục lỗ. Nút Pinyin che pinyin từ đích (`maskTargetPinyin`); nếu không che được đúng một chỗ thì xem pinyin được tính là gợi ý.
- `CnExample.sourceHanzi` giữ câu gốc khi admin sửa chữ Hán. Import lại khớp câu theo `hanzi` hoặc `sourceHanzi`; câu `flagged` hoặc đã sửa tay không bị cập nhật, hồi sinh hay xoá.
- Câu trả lời sai đang giữ chờ kháng nghị được gửi khi `pagehide`; `fetch` gửi kết quả dùng `keepalive`.
- `/admin/example-quality` bỏ câu `flagged`; `dismiss` câu đã rút bị từ chối.
- Hàng chờ kháng nghị gom và phân trang bằng `groupBy` ở DB.
