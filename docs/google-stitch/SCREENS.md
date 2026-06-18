# Learn Chinese — Screen Inventory for Stitch

Danh sách đầy đủ màn hình cần thiết kế. Upload kèm DESIGN.md để Stitch biết context từng màn.

---

## 1. Login (`/login`)

**Layout:** Centered card trên nền cream full-screen.

**Nội dung:**
- Wordmark: Learn**Chinese**
- Subtitle: "Đăng nhập để tạo bộ từ, ôn SRS, luyện nghe và phân tích chữ Hán."
- Nút: "Tiếp tục với Google" (icon Google + border)
- Footer nhỏ: "App độc lập"

---

## 2. Home (`/`)

**Header band:**
- Label: "HỌC TIẾNG TRUNG"
- H1: "Vocabulary Mastery"
- Subtitle tiếng Việt

**Stat grid (4 ô):**
| Ôn hôm nay | Bộ từ | Từ yếu | Nghe đúng |
| Số lớn đỏ | Số đen | Số amber | % đen |

**Quick actions (pill buttons):**
- Primary: "Tạo bộ từ mới"
- Secondary: Hanzi Lab, Luyện nghe, Dashboard lỗi

**Section:** "Bộ từ của tôi" — grid 2 cột, mỗi card: tên bộ, "X từ · Y cần ôn · Z yếu"

**Empty state:** "Chưa có bộ từ. Tạo bộ từ sau buổi học để bắt đầu."

---

## 3. Word Sets List (`/sets`)

- Header: "Bộ từ" + CTA "Tạo mới"
- List/grid các bộ từ
- Mỗi item: title, mô tả ngắn, metadata, progress

---

## 4. Create Set (`/sets/create`)

**Form:**
- Input: Tên bộ từ
- Textarea: Mô tả (optional)
- Textarea monospace lớn: Dán danh sách từ (mỗi dòng 1 từ)
- Hint: "Tối đa 200 từ"

**Actions:**
- "Kiểm tra dữ liệu" → Coverage report (pinyin, nghĩa, audio, phân tích chữ)
- "Thêm HSK 1" (shortcut)
- Primary: "Bắt đầu học"

---

## 5. Set Detail (`/sets/[id]`)

- Header: tên bộ + stats
- CTAs: "Luyện bộ từ", "Luyện nghe", "Luyện câu"
- Word list: mỗi row = hanzi + pinyin + nghĩa + progress badge
- Tap row → Word Card

---

## 6. Word Card (`/words/[id]`) — CORE SCREEN

**Hero area:**
```
折磨          ← hanzi 48px Noto Sans SC
zhé mó        ← pinyin, vermillion
Giày vớ       ← Hán Việt
làm khổ, hành hạ  ← nghĩa tiếng Việt
[🔊 Phát âm]
```

**5 tabs (pill tab bar):**
1. Tổng quan — mnemonic, từ liên quan, links
2. Ví dụ — câu ví dụ highlight từ đích + nút nghe
3. Cấu tạo chữ — breakdown từng ký tự (bộ thủ, thành phần)
4. Cách dùng — mẫu câu + ví dụ
5. Luyện tập — links tới practice modes

---

## 7. Practice Session (`/practice/[setId]`)

**Header:** Progress "Câu 5 / 20" + bar

**Question types (thiết kế 2-3 variants):**
- Multiple choice: 4 options dạng bordered cards
- Text input: nhập pinyin hoặc hanzi
- Audio: waveform/icon + "Nghe và chọn"

**Feedback states:**
- Đúng: border xanh + "Chính xác!"
- Sai: border đỏ + đáp án đúng + giải thích

**End screen:** Điểm, danh sách từ yếu, "Luyện lại" / "Về bộ từ"

---

## 8. SRS Review (`/review`)

- Header: "Ôn hôm nay" + số từ due
- Same question UI as practice
- Completion: "Ôn xong!" + tóm tắt

---

## 9. Hanzi Lab (`/hanzi-lab`)

- Input area: paste 1-15 ký tự
- Results panel:
  - Thông tin từ (nếu nhiều ký tự)
  - Per-character card: radical highlighted, components, Hán Việt, mnemonic
  - Similar characters row (chips)

---

## 10. Listening Picker (`/listening`)

- Header: "Luyện nghe"
- List bộ từ để chọn
- Mỗi item: tên + số từ + arrow
- Tap → practice mode=listening

---

## 11. Progress Dashboard (`/dashboard`)

**Sections:**
- Tổng quan stats (tổng câu trả lời, tỷ lệ đúng)
- Channel accuracy bars: Nghĩa, Pinyin, Nghe, Câu, Bộ thủ
- Top lỗi: numbered list
- Từ yếu: amber chips
- Gợi ý: card với tips

---

## 12. Admin CMS (`/admin`)

- Tab: Import từ / Import hanzi
- Upload CSV/XLSX
- Preview table
- "Publish" button
- Word table với search/filter

---

## Mobile Variants (thiết kế thêm)

- Bottom nav: Trang chủ | Bộ từ | Ôn tập | Hanzi Lab | Tiến bộ
- Word card: tabs scroll ngang
- Practice: full-screen, nút lớn 48px+
- Sidebar → drawer khi tap hamburger
