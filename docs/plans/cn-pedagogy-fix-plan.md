# Kế hoạch sửa bản tiếng Trung — sư phạm & độ tin cậy dữ liệu

> Tài liệu này dành cho Cursor (hoặc agent khác) thực hiện **tuần tự từng task**.
> Viết ngày 2026-10-21, dựa trên code tại commit `a25f175`.

---

## 0. Quy tắc bắt buộc khi làm (đọc trước mọi task)

1. **Đọc `AGENTS.md` trước.** Tuân thủ conventions: business logic ở `src/services/chinese/`, test ở `src/lib/__tests__/`, API trả `{ ok, ... }` qua `src/lib/apiUtils.ts`.
2. **Mỗi task = 1 commit.** Không gộp nhiều task. Message dạng `fix(srs): <mô tả>` / `feat(learn): ...`.
3. **Sau mỗi task chạy:**
   ```bash
   npm test
   npm run typecheck
   ```
   Cả hai phải qua trước khi sang task tiếp. Nếu có migration Prisma: `npx prisma migrate dev --name <tên>` rồi `npx prisma generate`.
4. **Không sửa thứ ngoài phạm vi task.** Không refactor "tiện tay", không đổi format code xung quanh, không đổi tên hàm public trừ khi task yêu cầu.
5. **Text UI viết bằng tiếng Việt**, giữ giọng văn hiện tại của app.
6. **Mỗi thay đổi logic phải có test** (Vitest). Test service mock Prisma bằng `vi.mock('@/lib/prisma')` như các test hiện có.
7. **Không xoá cột DB** trong kế hoạch này. Cột thừa chỉ để nguyên (tránh mất dữ liệu).
8. Làm theo **thứ tự Phase 1 → 5**. Trong một phase, làm theo thứ tự task. Phase sau phụ thuộc phase trước.
9. Nếu thấy code thực tế khác mô tả ở đây (file đã đổi tên, hàm không còn): **dừng lại, ghi chú vào cuối file này mục "Ghi chú khi thực hiện"**, chọn cách gần nhất với ý định của task, không tự bịa thiết kế mới.

---

## Tổng quan các phase

| Phase | Mục tiêu | Rủi ro | Ước lượng |
|---|---|---|---|
| **1. Sửa nhanh** | Lịch ôn hiển thị đúng, phạt lỗi hợp lý, bài nghe thật sự là nghe, hint không được tính là nhớ | Thấp | 1–2 ngày |
| **2. Học từ mới + giới hạn/ngày + mở kênh dần** | Người học không bị dội 600 mục; có bước encoding trước khi kiểm tra | Trung bình | 3–4 ngày |
| **3. Định nghĩa "đã nắm" & tiến độ** | Một định nghĩa mastery duy nhất, progress trung thực | Trung bình | 1–2 ngày |
| **4. Tách nội dung chuẩn / cá nhân** | Import của một user không ghi đè nội dung của mọi người | Cao (nhiều chỗ đọc dữ liệu) | 3–4 ngày |
| **5. Chấm điểm phía server + chống gửi trùng** | SRS chỉ dựa trên kết quả server chấm | Trung bình | 1–2 ngày |

---

## Phase 1 — Sửa nhanh

### Task 1.1 — Một nguồn duy nhất cho công thức lịch ôn

**Vấn đề:** `computeNextReview` (backend, `src/services/chinese/cnSrsService.ts:85`) và `formatReviewScheduleLabel` (UI, `src/lib/chinese/reviewMetrics.ts:569`) là hai bản copy công thức khác nhau. Sai ở bậc 0–1 backend hẹn **30 phút**, UI báo **"Hẹn lại sau 1 ngày"**.

**Việc cần làm:**
1. Tạo file mới `src/lib/chinese/srsSchedule.ts` (thuần, **không import prisma**). Chuyển vào đây:
   - `computeNextReview` + interface `ComputeNextReviewOptions`
   - `nextStateFromInterval`
2. Trong `cnSrsService.ts`: xoá bản cũ, `import` từ `srsSchedule.ts` và **re-export** (`export { computeNextReview, nextStateFromInterval } from '@/lib/chinese/srsSchedule'`) để không vỡ import cũ/test cũ.
3. Viết lại `formatReviewScheduleLabel(intervalIdx, correct, now, opts?)` để **gọi `computeNextReview`** rồi format `dueAt - now`:
   - < 60 phút → `Hẹn lại sau ${n} phút`
   - < 24 giờ → `... sau ${n} giờ`
   - còn lại → `... sau ${n} ngày`
   - Đúng → prefix `Gặp lại sau`, sai → `Hẹn lại sau`.
   - `opts` nhận `{ hintUsed?: boolean }` (dùng ở Task 1.4; ở task này chỉ khai báo, truyền xuống `computeNextReview`).
4. Xoá dòng `void nextIdx;` và logic copy cũ.

**Test (`src/lib/__tests__/reviewMetrics.test.ts` + file mới `srsSchedule.test.ts`):**
- Sai ở idx 0 → label chứa `30 phút`.
- Sai ở idx 1 → `30 phút`.
- Sai ở idx 2 → `1 ngày`.
- Đúng ở idx 2 → `7 ngày` (idx 3).
- Với mọi idx 0..5 và correct true/false: `formatReviewScheduleLabel` phải khớp `computeNextReview(...).dueAt` (viết test lặp).

**Xong khi:** label UI và dueAt backend luôn khớp; test cũ `cnSrsService.test.ts` vẫn qua.

---

### Task 1.2 — Sửa mức phạt khi sai ở giai đoạn duy trì

**Vấn đề:** `errorSeverity()` (`src/lib/chinese/errorMapping.ts`) trả `heavy` cho **mọi** loại lỗi mà `inferErrorType` sinh ra → nhánh `light` không bao giờ chạy. Một từ ở bậc 30 ngày sai 1 lần rơi về idx 1 (MCQ, 1 ngày). Phạt quá nặng, người học thấy "ôn mãi không tiến".

**Quy tắc mới (áp trong `computeNextReview`):**

| Bậc hiện tại (idx) | Sai → idx mới | dueAt |
|---|---|---|
| 0 (MCQ1) | 0 | +30 phút |
| 1 (MCQ2) | 0 | +30 phút |
| 2 (Recall) | 1 | +1 ngày |
| ≥ 3 (Maintain) | **2** (Recall) | +1 ngày |

→ Tức là bỏ khái niệm `lapseSeverity` khỏi việc tính lịch. Maintain sai luôn về Recall.

**Việc cần làm:**
1. Trong `srsSchedule.ts`: bỏ tham số `lapseSeverity` khỏi `computeNextReview` (hoặc giữ trong interface nhưng không dùng — ưu tiên **bỏ**, sửa các chỗ gọi).
2. Trong `constants.ts`: xoá `CN_LAPSE_HEAVY_IDX` nếu không còn ai dùng (grep trước). Giữ `CN_LAPSE_RECALL_IDX`.
3. **Sticking point** (`incrementHeavyLapse` trong `cnSrsService.ts`): đổi điều kiện tăng counter thành: *trả lời sai khi channel idx trước khi trả lời ≥ 2* (tức là đã từng nhớ được rồi lại quên). Không phụ thuộc `errorSeverity` nữa. Giữ tên field DB `*HeavyLapses` (không migration).
4. `errorSeverity` vẫn giữ cho báo cáo nếu nơi khác dùng; nếu chỉ `cnSrsService` dùng thì xoá import ở đó.

**Test (`cnSrsService.test.ts`, `srsSchedule.test.ts`):**
- idx 5 sai → idx 2, dueAt +1 ngày.
- idx 3 sai → idx 2.
- idx 1 sai → idx 0, +30 phút.
- Sai ở idx 0/1 **không** tăng heavyLapses; sai ở idx ≥ 2 tăng 1; đủ `CN_STICKING_POINT_HEAVY_LAPSES` (3) → `isStickingPoint = true`.

---

### Task 1.3 — Bài nghe: ẩn pinyin

**Vấn đề:** `QuestionHeroCard` (`src/components/chinese/QuestionRenderer.tsx:~640`) với câu `sound_to_hanzi` / `sound_to_hanzi_typed` hiển thị pinyin cỡ chữ lớn → đây là bài "đọc pinyin", không phải nghe.

**Việc cần làm:**
1. Khi `isSound`:
   - Hiển thị **nút loa lớn** (dùng `SpeakButton` sẵn có) + chữ nhỏ "Nghe và chọn chữ đúng".
   - **Không hiển thị pinyin.** Thêm nút phụ "Hiện pinyin" → bấm thì hiện pinyin và đánh dấu **đã dùng gợi ý** (state `hintUsed` — xem Task 1.4).
   - Sau khi trả lời (có `feedback`), luôn hiện pinyin trong phần đáp án (kiểm tra `questionDisplay.ts` đã có chưa; nếu có rồi thì không đổi).
2. **Fallback khi trình duyệt không có TTS** (`supported === false` từ `useSpeech`): hiện pinyin ngay như cũ, **không** đánh dấu hint (không phạt người học vì thiết bị).
3. Không đổi logic auto-play hiện có (`useEffect` auto speak sau 400ms).

**Test:** nếu có test render cho `QuestionRenderer`/`questionDisplay`, thêm case: câu sound không có text pinyin trong hero trước khi trả lời. Nếu repo không có test component, bỏ qua test UI nhưng ghi chú vào commit message; kiểm tra tay bằng `npm run dev` (port 3001) → `/review`.

---

### Task 1.4 — Ghi nhận việc dùng gợi ý (hint) và không cho lên bậc

**Vấn đề:** người học mở `HintPanel` (mnemonic/ghi chú/chữ thành phần), mở pinyin câu (`SentencePromptCard`), rồi trả lời đúng → vẫn lên bậc như truy hồi độc lập.

**Việc cần làm:**

1. **Type** — `src/types/chinese.ts`, `CnPracticeSubmitItem` thêm:
   ```ts
   hintUsed?: boolean;
   responseMs?: number; // thời gian từ lúc hiện câu đến lúc trả lời
   ```
2. **Validation** — `validatePracticeSubmitItems` (`src/lib/apiValidation.ts`): chấp nhận `hintUsed` là boolean hoặc undefined; `responseMs` là số nguyên 0..600000 hoặc undefined. Sai kiểu → reject.
3. **DB** — `CnAnswerLog` thêm:
   ```prisma
   hintUsed   Boolean @default(false)
   responseMs Int?
   ```
   Migration tên `answer_log_hint_response`.
4. **UI — `QuestionRenderer.tsx`:**
   - State `hintUsed` (reset về false trong `advance`, cùng chỗ `setShowHint(false)`).
   - Set `true` khi: bấm mở `HintPanel` (chỗ `setShowHint(true)`), bấm "Hiện pinyin" ở câu nghe (Task 1.3), bấm hiện pinyin trong `SentencePromptCard` (thêm prop `onRevealPinyin?: () => void`, gọi trong handler toggle khi chuyển sang hiện).
   - Ghi `questionShownAt = Date.now()` khi `idx` đổi; trong `submitAnswer` tính `responseMs`.
   - Đưa `hintUsed`, `responseMs` vào `item` gửi lên.
   - Feedback text khi đúng mà có hint: `Đúng (có gợi ý)`. **Chú ý:** biến `isFeedbackCorrect` đang kiểm tra `feedback.startsWith('Đúng')` → vẫn đúng, không cần đổi.
   - Truyền `{ hintUsed }` vào `formatReviewScheduleLabel`.
5. **SRS — `srsSchedule.ts` `computeNextReview`:** thêm option `hintUsed?: boolean`. Quy tắc:
   - Đúng + `hintUsed` → **giữ nguyên idx**, `dueAt = now + 1 ngày`, state theo idx hiện tại.
   - Sai + hint → như sai bình thường.
6. **`applyPracticeItem` (`cnSrsService.ts`):** truyền `hintUsed` vào; với đúng-có-hint thì `total += 1`, **`correct` không tăng** (tỷ lệ đúng chỉ phản ánh truy hồi độc lập).
7. **Ghi log:** `submitReviewResults` và `logPracticeAnswers` ghi `hintUsed`, `responseMs` vào `CnAnswerLog`.
8. **Practice priority:** trong `loadPracticePriorityAdjustments` (`cnSrsService.ts:~187`), chỉ đếm log có `hintUsed = false` khi tính tỷ lệ đúng để giảm ưu tiên Review.
9. Các client khác dùng `QuestionRenderer` (`review`, `practice`, `hht`, `inferno`) tự nhận field mới qua `onAnswer` — kiểm tra hàm submit của từng client có spread nguyên item không; nếu đang chọn lọc field thì thêm `hintUsed`, `responseMs`.

**Test:**
- `computeNextReview({ intervalIdx: 3, correct: true, hintUsed: true })` → idx 3, +1 ngày.
- `applyPracticeItem` đúng-có-hint: total +1, correct +0.
- `validatePracticeSubmitItems` reject `hintUsed: 'yes'`, `responseMs: -1`.
- Label: đúng có hint ở idx 3 → `Gặp lại sau 1 ngày`.

---

### Task 1.5 — Thông báo "khó với nhiều người"

**Vấn đề:** `StickingPointCard` ghi "Từ này khó với nhiều người" — không có dữ liệu cộng đồng; và hiện sau **1** lần sai trong phiên (`QuestionRenderer.tsx:517`).

**Việc cần làm:**
1. `StickingPointCard.tsx`: đổi text thành `Bạn đang gặp khó ở từ này`.
2. Điều kiện hiện trong `QuestionRenderer`: `q.isStickingPoint === true` **hoặc** số lần sai trong phiên của từ đó **≥ 2**.

---

### Task 1.6 — Sửa nhãn/tài liệu sai lệch

**Việc cần làm (grep từng chuỗi, sửa cho khớp code thực tế: 3 kênh Nghĩa/Âm/Câu, 7 dạng câu, thang 1/1/3/7/14/30 ngày):**
- `src/app/(app)/page.tsx:33` — "4 kênh: nghĩa, nghe, pinyin, câu" → "3 kênh: nghĩa, âm đọc, câu".
- `src/components/chinese/SrsReportPanel.tsx:50` — bỏ nhãn "Sắp ra mắt" của kênh câu (kênh này đang chạy).
- `README.md` và `docs/` — sửa: số dạng câu (7), số kênh (3), thang ôn (tới 30 ngày; sau Phase 3 có thể là 120), bỏ mô tả Hanzi AI/DeepSeek (đã xoá ở migration `20260909100000_remove_hanzi_ai`), bỏ câu "tự tạo bộ demo cho người mới" nếu `cnSampleSetService` không được gọi từ luồng app (grep để xác nhận).
- Grep thêm: `grep -rn "5 kênh\|12 dạng\|360 ngày\|4 kênh" src docs README.md`.

**Không** đổi logic trong task này.

---

### Task 1.7 — Lint không quét `.claude/worktrees`

`npm run lint` lỗi vì quét `.next` trong `.claude/worktrees`. Thêm `.claude/**` vào `ignores` của file cấu hình ESLint (`eslint.config.*`). Chạy `npm run quality` phải qua.

---

## Phase 2 — Học từ mới, giới hạn mỗi ngày, mở kênh dần

**Vấn đề:** mọi kênh mở ngay (`isChannelUnlocked`, `isChannelRampEligible` luôn `true`), kênh chưa làm (`total === 0`) bị coi là đến hạn (`isChannelDue`). Bật SRS cho bộ 200 từ → ~600 mục ngay lập tức, người học bị kiểm tra trước khi được học.

**Thiết kế đích:**

```
Bộ từ bật SRS ──► Từ "chưa học" (introducedAt = null) ── không vào Review
                         │
                         ▼  (trang Học từ mới, tối đa N từ/ngày)
                  Xem thẻ từ → quiz nhanh → introducedAt = now
                         │
                         ▼
          Kênh Nghĩa mở ngay ─► đúng 1 lần (meaningIdx ≥ 1) ─► mở kênh Âm
                                └► meaningIdx ≥ 2 (+ có câu ví dụ hợp lệ) ─► mở kênh Câu
```

### Task 2.1 — Hằng số & schema

1. `constants.ts` thêm:
   ```ts
   /** Số từ mới tối đa được giới thiệu mỗi ngày */
   export const CN_NEW_WORDS_PER_DAY = 10;
   /** Số từ trong một lượt Học từ mới */
   export const CN_LEARN_BATCH_SIZE = 5;
   /** Kênh Âm mở khi kênh Nghĩa đạt idx này */
   export const CN_UNLOCK_SOUND_AT_MEANING_IDX = 1;
   /** Kênh Câu mở khi kênh Nghĩa đạt idx này */
   export const CN_UNLOCK_SENTENCE_AT_MEANING_IDX = 2;
   ```
2. `CnWordProgress` thêm `introducedAt DateTime?` + `@@index([userId, introducedAt])`.
3. Migration `progress_introduced_at` có **backfill SQL** (thêm tay vào file migration sau khi Prisma sinh):
   ```sql
   UPDATE "CnWordProgress"
   SET "introducedAt" = COALESCE("lastReviewedAt", "createdAt")
   WHERE "meaningTotal" > 0 OR "soundTotal" > 0 OR "sentenceTotal" > 0;
   ```
   → Người học cũ không bị gián đoạn: từ đã từng làm coi như đã học.
4. Cập nhật `createEmptyProgress` và mọi fixture test có `CnWordProgress` đầy đủ field (thêm `introducedAt: null`).

### Task 2.2 — Logic mở kênh thật

1. `src/lib/chinese/channelRamp.ts` — viết lại `isChannelRampEligible(p, channel)`:
   - Kênh đã từng làm (`total > 0`) → luôn `true` (không khoá lại cái người học đã có).
   - `p.introducedAt == null` → `false` cho mọi kênh.
   - `meaning` → `true`.
   - `sound` → `p.meaningIntervalIdx >= CN_UNLOCK_SOUND_AT_MEANING_IDX`.
   - `sentence` → `p.meaningIntervalIdx >= CN_UNLOCK_SENTENCE_AT_MEANING_IDX` (điều kiện "có câu ví dụ" đã được kiểm tra riêng bằng `wordsWithFillExamples` trong `collectDueChannelsForProgress` — giữ nguyên).
2. `practiceTaxonomy.ts` — `isChannelUnlocked` gọi cùng logic (hoặc xoá và thay toàn bộ chỗ gọi bằng `isChannelRampEligible`; chọn cách ít thay đổi hơn). `getUnlockedGroups` trả các group tương ứng kênh đã mở.
3. `cnSrsService.ts` — `isChannelDue`: thêm check `if (!isChannelRampEligible(p, channel)) return false;` **trước** check `total === 0`.
4. `src/lib/chinese/cnSrsDueQuery.ts` — prefilter SQL (`buildDueCandidateWhere`) thêm điều kiện `introducedAt: { not: null }` để không tải từ chưa học.
5. Kiểm tra các nơi đếm "đến hạn" (`countDueChannels`, `countDueToday`, briefing `src/app/api/review/briefing`, `setSrsProgress`) đều đi qua `isChannelDue` → tự động đúng. Grep `total === 0` / `Total === 0` để chắc không có chỗ nào tự tính lại.
6. **Practice / HHT / Inferno không bị chặn** bởi `introducedAt` (chúng không đổi lịch SRS). Không sửa các service đó.

**Test (`channelRamp.test.ts`, `cnSrsService.test.ts`, `cnSrsDueQuery.test.ts`, `practiceTaxonomy.test.ts`):**
- introducedAt null → không kênh nào due.
- introducedAt có, meaningIdx 0 → chỉ meaning due.
- meaningIdx 1 → meaning (nếu đến hạn) + sound due (sound total 0).
- meaningIdx 2 + có ví dụ → sentence due.
- Kênh sound đã có total > 0 nhưng meaningIdx tụt về 0 → sound **vẫn** eligible.
- Sửa các test cũ đang kỳ vọng "mọi kênh luôn mở".

### Task 2.3 — Service & API "Học từ mới"

1. File mới `src/services/chinese/cnLearnService.ts`:
   - `getLearnQueue(userId, limit = CN_LEARN_BATCH_SIZE)`:
     - Lấy pool từ SRS-active (`resolveSrsPoolWordIds`), gọi `ensureEnrollmentForActiveWords`.
     - `introducedToday` = đếm progress có `introducedAt` cùng `localDayKey` hôm nay (dùng `localDayKey` trong `reviewMetrics.ts`; query theo khoảng [đầu ngày, cuối ngày] theo cùng múi giờ hàm đó dùng).
     - `remainingToday = max(0, CN_NEW_WORDS_PER_DAY - introducedToday)`.
     - Lấy tối đa `min(limit, remainingToday)` progress có `introducedAt = null`, sắp xếp: theo thứ tự item trong bộ (`CnWordSetItem` — nếu không có cột thứ tự thì theo `id`/`createdAt` của set item), rồi `word.learningPriority`, `word.frequencyRank` (null xếp cuối).
     - Trả `{ words: CnWordCardDTO[] (đủ: hanzi, pinyin, hanViet, meaningVi, 1 ví dụ, mnemonicVi, audioText), remainingToday, totalUnintroduced }`. Tái dùng DTO/hàm build card sẵn có (`getWordCard` hoặc service flashcard) thay vì viết mới.
   - `markIntroduced(userId, wordIds)`:
     - Chỉ cập nhật progress của chính user, `introducedAt = null`, wordId thuộc SRS pool.
     - Không vượt quota: nếu `wordIds.length > remainingToday` → chỉ đánh dấu `remainingToday` từ đầu, trả về số đã đánh dấu.
     - Set `introducedAt = now`, `meaningDueAt = now`.
2. API:
   - `GET /api/learn` → `getLearnQueue`.
   - `POST /api/learn/introduce` body `{ wordIds: string[] }` (validate: mảng string, 1..`CN_LEARN_BATCH_SIZE`), rate limit giống submit.
   - Dùng `withAuth`, `apiSuccess`, `apiError` như các route khác.

**Test `cnLearnService.test.ts`:** quota theo ngày; không trả từ đã introduced; `markIntroduced` không vượt quota; không đụng progress user khác.

### Task 2.4 — Trang `/learn` (UI)

Luồng 3 bước trong `src/app/(app)/learn/`:

1. **Xem thẻ** — từng từ một: Hán tự lớn, nút phát âm (`SpeakButton`), pinyin, Hán Việt, nghĩa, 1 câu ví dụ (có audio), mnemonic nếu có. Nút "Tiếp" / "Quay lại". Tái dùng component thẻ từ/flashcard sẵn có nếu phù hợp (xem `src/components/chinese/`).
2. Hết batch → gọi `POST /api/learn/introduce`.
3. **Quiz nhanh** — mỗi từ 1 câu `hanzi_to_meaning` (MCQ) dùng `QuestionRenderer` sẵn có. Lấy câu hỏi: tái dùng generator của review cho đúng các wordId vừa học (thêm param `wordIds` vào API review nếu cần, hoặc endpoint `GET /api/learn/quiz?wordIds=`). Kết quả submit qua `/api/review/submit` (đây là lần truy hồi đầu, ghi vào SRS kênh Nghĩa).
4. Màn kết thúc: "Đã học X từ. Còn Y từ mới hôm nay." + nút "Học tiếp" (nếu còn quota) / "Ôn hôm nay".
5. Trạng thái rỗng: hết quota → "Hôm nay đủ rồi, quay lại ngày mai"; không còn từ chưa học → gợi ý bật SRS cho bộ khác.

### Task 2.5 — Trang chủ & điều hướng

- Trang chủ (`src/app/(app)/page.tsx`): 2 CTA chính theo thứ tự: **"Ôn hôm nay (N mục)"** và **"Học từ mới (còn X/10 hôm nay)"**. Nếu Review = 0 thì CTA Học từ mới thành nút chính.
- Thêm "Học từ mới" vào điều hướng desktop/mobile cạnh Review.
- Review briefing: nếu không có mục đến hạn nhưng còn từ chưa học → hiện gợi ý sang `/learn`.

**Xong Phase 2 khi:** bật SRS bộ 200 từ mới → Review = 0 mục; vào `/learn` học 5 từ → Review có 5 mục kênh Nghĩa; sau khi đúng nghĩa 1 lần → hôm sau có thêm kênh Âm.

---

## Phase 3 — Định nghĩa "đã nắm" & hiển thị tiến độ trung thực

### Task 3.1 — Mô hình mastery một nguồn

File mới `src/lib/chinese/masteryModel.ts` (thuần):

```ts
/** Kênh bắt buộc của một từ: meaning, sound; + sentence nếu từ có câu ví dụ hợp lệ */
export function requiredChannels(hasFillExample: boolean): SkillChannel[];

/** Từ "đã nắm": mọi kênh bắt buộc có intervalIdx >= CN_MASTERED_MIN_IDX */
export function isWordMastered(p: CnWordProgress, hasFillExample: boolean): boolean;

/** Trạng thái tổng của từ = trạng thái THẤP NHẤT trong các kênh bắt buộc.
 *  Kênh bắt buộc chưa làm (total = 0) tính là 'new'/'learning' — KHÔNG bỏ qua. */
export function wordLevelState(p: CnWordProgress, hasFillExample: boolean): CnWordProgressState;
```

- `constants.ts`: `export const CN_MASTERED_MIN_IDX = 3;` — idx 3 nghĩa là đã **gõ đúng ở bậc Recall không dùng hint** (vì sau Task 1.4 hint không cho lên bậc), tức có ít nhất một lần truy hồi chủ động độc lập ở mỗi kênh.
- `aggregateState` trong `cnSrsService.ts` → gọi `wordLevelState` (cần biết `hasFillExample`; nếu không có sẵn ở chỗ gọi, mặc định `true` khi `sentenceTotal > 0`, ngược lại `false`. Ghi rõ giả định này trong comment).
- `progress.intervalIdx = Math.max(...)` (`cnSrsService.ts:~594`) → đổi thành **`Math.min`** trên các kênh bắt buộc đã được introduce. Grep mọi chỗ đọc `progress.intervalIdx`/`state` (báo cáo, export Excel) để chắc nghĩa mới không làm vỡ UI.

**Test:** từ có meaning idx 5, sound total 0 → **không** mastered, state không vượt `learning`; mọi kênh ≥ 3 → mastered.

### Task 3.2 — Kéo dài thang ôn

`CN_SRS_INTERVAL_DAYS = [1, 1, 3, 7, 14, 30, 60, 120]`.
- Kiểm tra `stageFromIntervalIdx`, `clampSrsIntervalIdx`, `CN_STATE_THRESHOLDS` (giữ `mastered: 5` cho state hiển thị hoặc chuyển sang dùng masteryModel — **ưu tiên dùng masteryModel**, giữ thresholds cho tương thích).
- Import/restore Excel (`cnExcelService.ts:~897`) clamp idx theo độ dài mới — dùng `clampSrsIntervalIdx`, không hard-code.
- Cập nhật test có hard-code độ dài thang (grep `CN_SRS_INTERVAL_DAYS.length`, `30`).

### Task 3.3 — Tiến độ bộ từ: tách 3 con số

**Vấn đề:** `computeSetChannelProgress` (`setSrsProgress.ts`) = 100% − tỷ lệ kênh đến hạn → gọi "Kênh ổn định" dù từ vừa sai 30 phút trước.

**Việc cần làm:**
1. Thay bằng hàm trả object:
   ```ts
   { introduced: number; mastered: number; total: number; dueChannels: number }
   ```
2. UI bộ từ (grep nơi dùng `computeSetChannelProgress`, `formatSetDueChannelsLabel`): hiển thị
   - "Đã học **X/N** từ" (introduced)
   - "Đã nắm **Y/N**" (mastered theo masteryModel) — đây là thanh progress chính
   - "**Z** kênh cần ôn" (giữ label cũ)
3. Bỏ cụm "Kênh ổn định".
4. Báo cáo (`SrsReportPanel`, `cnReviewStatsService`): phân bố trạng thái dùng `wordLevelState`.
5. "Độ chín" (grep `độ chín`/`Độ chín`): đổi thành dùng `isWordMastered`, không dùng "một trong ba kênh ≥ familiar".

---

## Phase 4 — Tách nội dung chuẩn (canonical) và chỉnh sửa cá nhân

**Vấn đề:** `CnWord.simplified` unique toàn hệ thống. Các đường ghi sau đang **sửa bản ghi chung**:

| Đường ghi | File | Ai gọi |
|---|---|---|
| `upsertTuVungWordsAndExamples` (upsert word + **xoá hết** example rồi tạo lại) | `cnExcelService.ts:~674` | user import (`/api/sets/import`, smart import) **và** admin import |
| `updateWordFields` | `cnContentService.ts:~413` | user sửa từ (`/api/words/[id]`) |
| `resolveSetItemWord` upsert | `cnSetService.ts:~376` | user điền nghĩa cho từ chưa có |
| `publishWordRows` | `cnImportService.ts:~77` | xác nhận lại: chỉ admin? |

**Quy tắc mới:**
- **Admin** → ghi vào canonical (`CnWord`, `CnExample` với `ownerUserId = null`) như hiện tại.
- **User** → **không bao giờ** update `CnWord` đã tồn tại và **không bao giờ** xoá example canonical. Mọi chỉnh sửa của user đi vào lớp override riêng.
- User import một từ **chưa tồn tại** → được tạo `CnWord` mới (để có id), nhưng nội dung user nhập **cũng** ghi vào override của user đó. (Bản ghi `CnWord` tạo bởi user để `status = 'draft'` hoặc thêm cờ — xem 4.1.)

### Task 4.1 — Schema

```prisma
model CnUserWordOverride {
  id           String   @id @default(cuid())
  userId       String
  wordId       String
  pinyin       String?
  hanViet      String?
  meaningVi    String?
  partOfSpeech String?
  ghiChu       String?
  mnemonicVi   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  word         CnWord   @relation(fields: [wordId], references: [id], onDelete: Cascade)
  @@unique([userId, wordId])
  @@index([wordId])
}
```
- `CnWord` thêm relation `userOverrides CnUserWordOverride[]` và `createdByUserId String?` (null = admin/seed).
- `CnExample` thêm `ownerUserId String?` (null = canonical) + `@@index([wordId, ownerUserId])`.
- Migration `user_word_override`. **Không** backfill (dữ liệu cũ coi là canonical).

### Task 4.2 — Lớp đọc hợp nhất

File mới `src/services/chinese/cnWordViewService.ts`:

```ts
/** Trả nội dung từ đã áp override của user + example (canonical ∪ của user).
 *  Nếu user có example riêng cho từ → chỉ dùng example riêng (user đã chủ động thay). */
export async function loadWordViewsForUser(userId: string, wordIds: string[]): Promise<Map<string, CnWordView>>;
export function applyOverride(word: CnWord, override: CnUserWordOverride | null): CnWord; // thuần, test được
```

Sau đó **thay toàn bộ chỗ đọc nội dung từ cho người học** sang dùng lớp này. Tìm bằng:
```bash
grep -rn "include: { word\|word: true\|examples: \|cnExample.findMany\|cnWord.findMany\|cnWord.findUnique" src/services src/app/api
```
Tối thiểu phải phủ: sinh câu hỏi Review/Practice/HHT/Inferno (`generateQuestions` caller), thẻ từ (`getWordCard`), flashcard, chi tiết bộ từ, export Excel của user, `loadWordIdsWithFillExamples` (phải tính cả example của user). Admin screens đọc canonical, **không** áp override.

### Task 4.3 — Đổi đường ghi của user

1. `cnExcelService.ts`: tách `upsertTuVungWordsAndExamples(tx, rows, actor)` với `actor: { kind: 'admin' } | { kind: 'user'; userId }`.
   - admin → hành vi cũ.
   - user → với mỗi row: `cnWord.findUnique({ simplified })`; nếu chưa có → `create` (status `published`, `createdByUserId = userId`); **upsert `CnUserWordOverride`** với các field user nhập; xoá example **có `ownerUserId = userId`** của từ đó rồi tạo example mới với `ownerUserId = userId`.
   - Truyền `actor` đúng từ từng route (`/api/admin/import` → admin; `/api/sets/import`, `/api/sets/import/smart`, `/api/sets/[id]/import/smart` → user).
2. `updateWordFields` → upsert `CnUserWordOverride` thay vì `cnWord.update`. Trả DTO đã áp override.
3. `resolveSetItemWord` → nếu từ đã tồn tại: chỉ ghi override; nếu chưa: tạo word + override.
4. `publishWordRows`: xác nhận chỉ admin gọi; nếu user cũng gọi được thì áp quy tắc như (1).
5. Khôi phục tiến độ từ file export (restore) không được ghi đè canonical — kiểm tra nhánh restore trong `cnExcelService.ts`.

**Test (bắt buộc, đây là phần rủi ro):**
- User A import `学生` với nghĩa "X" → `CnWord.meaningVi` canonical **không đổi**; A thấy "X"; user B thấy canonical.
- User A import lại → example canonical **không bị xoá**; example của B (nếu có) không bị xoá.
- Admin import → canonical đổi; A vẫn thấy override của mình.
- `updateWordFields` của A không đổi kết quả `getWordCard` của B.

---

## Phase 5 — Chấm điểm phía server & chống gửi trùng

**Vấn đề:** `reconcileSubmitItems` (`src/lib/chinese/answerGrading.ts`) trả nguyên dữ liệu; server tin `correct` từ client. Request lặp (mạng chập chờn, retry trong `useIncrementalSubmit`) có thể cộng 2 lần.

### Task 5.1 — Hàm chấm dùng chung

1. `src/lib/chinese/answerGrade.ts`: thêm hàm thuần
   ```ts
   export function expectedAnswerFor(type: CnQuestionType, word: { simplified: string; meaningVi: string }): string;
   export function gradeAnswerText(type: CnQuestionType, expected: string, answer: string): boolean;
   ```
   - `hanzi_to_meaning` → expected = `meaningVi`; mọi type khác → `simplified` (khớp `generateQuestions.ts`).
   - So sánh: `trim()`, chuẩn hoá Unicode NFC, bỏ khoảng trắng thừa giữa ký tự Hán. Giữ hành vi hiện tại là so khớp chính xác sau chuẩn hoá.
2. `gradeAnswer(question, answer)` phía client gọi `gradeAnswerText` để client/server cùng một logic.

### Task 5.2 — Submit gửi câu trả lời, server chấm

1. `CnPracticeSubmitItem` thêm `answer: string` (bắt buộc với review submit) và `clientAnswerId: string` (UUID tạo ở client cho mỗi lần trả lời).
2. `QuestionRenderer.submitAnswer` gửi `answer` (option đã chọn hoặc text đã gõ) và `clientAnswerId = crypto.randomUUID()`.
3. `reconcileSubmitItems(userId, items)` → viết lại:
   - Load word view qua `loadWordViewsForUser` (Phase 4 — **phải dùng nội dung đã áp override**, nếu không user sửa nghĩa sẽ bị chấm sai).
   - `correct = gradeAnswerText(type, expectedAnswerFor(type, view), item.answer)`.
   - Nếu khác giá trị client gửi → dùng giá trị server, `console.warn` một dòng (không log nội dung câu trả lời).
4. **Idempotency:** `CnAnswerLog` thêm `clientAnswerId String?` + `@@unique([userId, clientAnswerId])`. Trong `submitReviewResults`: trước khi apply, query các `clientAnswerId` đã tồn tại → **bỏ qua** item trùng (không apply SRS, không ghi log). Migration `answer_log_client_id`.
5. Tương thích ngược: nếu item thiếu `answer` (client cũ đang mở tab) → chấp nhận `correct` của client **một lần** nhưng log warn; ghi TODO xoá nhánh này sau 2 tuần.
6. Áp dụng cho cả `/api/practice/submit`, HHT, Inferno submit nếu chúng cũng nhận `correct` (grep `validatePracticeSubmitItems`).

**Test:**
- Client gửi `correct: true` với answer sai → server ghi sai.
- Gửi 2 lần cùng `clientAnswerId` → progress chỉ đổi 1 lần, chỉ 1 log.
- User có override nghĩa → chấm theo nghĩa override.

---

## Ngoài phạm vi (KHÔNG làm trong kế hoạch này)

- Thêm dạng câu hỏi mới, luyện nói, viết tay, thanh điệu.
- Gộp/đổi tên chế độ HHT/Inferno (để đợt sau, khi Phase 2–3 đã ổn).
- Chẩn đoán lỗi dựa trên distractor (`errorMapping.ts`) — chỉ đổi nhãn nếu cần, không làm logic mới.
- Cài đặt số từ mới/ngày theo từng user (hiện dùng hằng số).

---

## Checklist nghiệm thu cuối cùng

- [ ] `npm run quality` qua.
- [ ] Sai ở MCQ → UI báo "Hẹn lại sau 30 phút", DB `dueAt` đúng +30 phút.
- [ ] Từ bậc 30 ngày sai 1 lần → về Recall (3 ngày sau khi đúng lại), không về MCQ.
- [ ] Câu nghe không hiện pinyin trước khi trả lời (trừ máy không có TTS).
- [ ] Mở gợi ý rồi trả lời đúng → "Đúng (có gợi ý)", bậc không tăng, hẹn 1 ngày.
- [ ] Bật SRS bộ mới → Review 0 mục; `/learn` học được tối đa 10 từ/ngày.
- [ ] Kênh Âm chỉ xuất hiện sau khi đúng kênh Nghĩa lần đầu; kênh Câu sau idx Nghĩa ≥ 2.
- [ ] Người học cũ: các kênh đã làm vẫn ôn bình thường sau migration.
- [ ] Từ chỉ làm kênh Nghĩa không bao giờ hiện "Đã nắm".
- [ ] User A import/sửa từ không làm đổi nội dung user B thấy.
- [ ] Gửi trùng request không cộng tiến độ 2 lần; sửa `correct` bằng DevTools không có tác dụng.

---

## Ghi chú khi thực hiện

Đã làm hết Phase 1–5, mỗi task một commit trên `main` (chưa push). `npm run quality` qua: 294 test, lint còn 0 warning sau khi bỏ import thừa, typecheck và build qua.

- Câu nghe MCQ ghi "Nghe và chọn chữ đúng". Câu nghe gõ ghi "Nghe và gõ chữ đúng".
- `useSpeech` có `ready`. Khung hình đầu chưa biết máy có TTS hay không thì chưa hiện pinyin, và không tính là gợi ý.
- Không có cột `audioText`. Thẻ từ mới đọc `simplified` và chữ Hán của câu ví dụ.
- `CnWordSetItem` không có `createdAt`. Hàng học từ mới xếp theo `id` của mục trong bộ, rồi `learningPriority`, rồi `frequencyRank`.
- Luyện / HHT / Inferno không chặn bằng `introducedAt`. Ôn SRS thì có: từ chưa học không đến hạn. Kênh đã làm (`total > 0`) vẫn mở.
- SQL lọc mục đến hạn bỏ hàng `introducedAt` null. Migration backfill các hàng đã có lần làm.
- Đã tạo database `prisma_migrate_shadow` vì `migrate dev` báo thiếu shadow DB.
- `useRef(Date.now())` bị lint `react-hooks/purity`. Đổi thành ref 0, ghi thời điểm trong effect.
- Test câu ở chế độ câu cần `meaningIntervalIdx` 2, nếu không kênh câu bị khoá và rơi về dạng khác.
- Task 4.1 nói từ do user tạo có thể để `draft`. Task 4.3 ghi `published` và `createdByUserId`. Làm theo 4.3 để từ mới vào được hàng học.
- `publishWordRows` chỉ được gọi từ `/api/admin/import`. Admin xuất bản lại chỉ xoá example `ownerUserId` null, để example của người học còn.
- Import admin dạng `tu_vung` cũng chỉ xoá example canonical.
- `lookupTerms` vẫn đọc bản chuẩn. Màn tra cứu và preview import không hiện nghĩa riêng của user.
- File Excel tiến độ của user không có cột nghĩa. Test tách user A/B đi qua `getWordCard` và `loadWordViewsForUser`.
- `introducedToday` đếm mọi hàng tiến độ được giới thiệu trong ngày local, không chỉ bộ đang mở.
- Câu đúng sau gợi ý vẫn được phiên học phía client đếm là đúng. Bộ đếm đúng của SRS thì không tăng.
- Migration `clientAnswerId` được viết tay rồi `migrate deploy`, vì `migrate dev` dừng ở cảnh báo unique index khi shell không tương tác.
- Trang `/learn` khi chưa đăng nhập hiện "Unauthorized" và nút thử lại. Chưa bấm được vòng thẻ từ → quiz vì trình duyệt không có phiên đăng nhập.
- Thanh dưới có 7 mục sau khi thêm "Học từ mới". Chưa xem trên điện thoại.
- 2026-10-21: HHT và Địa Ngục rời menu chính và thanh dưới. Vào qua mục Thử nghiệm (`/experiments`): sidebar desktop và menu tài khoản trên mobile. `NEXT_PUBLIC_EXPERIMENTAL_MODES=0` ẩn mục này; route `/hht`, `/inferno` và dữ liệu giữ nguyên. Tab Địa Ngục trên báo cáo chỉ hiện khi mở `?tab=inferno`. `/learn` được thêm vào danh sách route cần đăng nhập. Nhãn briefing "Độ chín" đổi thành "Đã nắm" vì số đó đã là `isWordMastered`. Không sửa logic HHT/Địa Ngục.
