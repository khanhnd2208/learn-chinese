# Hướng dẫn tải lên Google Stitch

Tài liệu này hướng dẫn bạn dùng các file đã chuẩn bị để Stitch tạo bộ UI/UX cho app **Learn Chinese**.

---

## Bước 1 — Màn hình "Start with your design"

### Cách 1 (khuyên dùng): Dán DESIGN.md

1. Mở file [`DESIGN.md`](../../DESIGN.md) ở thư mục gốc project
2. Copy **toàn bộ** nội dung
3. Dán vào ô **"Paste a DESIGN.md file here..."**

### Cách 2: Upload file

Kéo thả hoặc upload các file sau:

| File | Đường dẫn | Mục đích |
|------|-----------|----------|
| **DESIGN.md** | `DESIGN.md` | Design system chính (bắt buộc) |
| **SCREENS.md** | `docs/google-stitch/SCREENS.md` | Chi tiết 12 màn hình cần thiết kế |
| **globals.css** | `src/app/globals.css` | Token màu hiện tại của app |

**Upload code, images, fonts and logos** (tùy chọn):
- `src/app/globals.css` — màu sắc thực tế
- `src/components/layout/AppSidebar.tsx` — layout sidebar
- `src/components/chinese/HanziCard.tsx` — thẻ từ 5 tab
- Chưa có logo — Stitch sẽ thiết kế wordmark `LearnChinese` theo DESIGN.md

**Upload .fig** — Bỏ qua nếu bạn chưa có file Figma.

---

## Bước 2 — Màn hình tiếp theo (GitHub / Website / Instructions)

### Public GitHub repository

- Nếu repo **public**: dán URL, ví dụ `https://github.com/<user>/learn-chinese`
- Nếu repo **private**: bỏ trống, dùng DESIGN.md đã dán ở bước 1

### Add website (tham khảo UX, không copy visual)

Chọn **một** URL làm reference cho flow học tập:

| URL | Lý do |
|-----|-------|
| `https://www.skritter.com` | Học chữ Hán, giao diện sạch |
| `https://ankiweb.net` | SRS review flow |
| `https://www.pleco.com` | Tra từ / word card depth |

Hoặc để trống nếu chỉ muốn Stitch theo DESIGN.md.

### Additional instructions

Copy toàn bộ nội dung file [`STITCH-ADDITIONAL-INSTRUCTIONS.txt`](./STITCH-ADDITIONAL-INSTRUCTIONS.txt) và dán vào ô **Additional instructions**.

---

## Bước 3 — Sau khi Stitch tạo xong

1. **Review** từng màn hình trong danh sách 12 screens (xem `SCREENS.md`)
2. **Ưu tiên** thiết kế lại: Word Card (5 tab), Practice Session, Home, Sidebar mobile
3. **Export** DESIGN.md cập nhật từ Stitch nếu có — thay thế file gốc
4. **Export** sang HTML/Figma nếu cần implement vào Next.js

---

## Checklist trước khi bấm Continue

- [ ] Đã dán hoặc upload `DESIGN.md`
- [ ] Đã dán `STITCH-ADDITIONAL-INSTRUCTIONS.txt` vào Additional instructions
- [ ] (Tùy chọn) Đã thêm URL tham khảo UX
- [ ] (Tùy chọn) Đã upload `SCREENS.md` + `globals.css`
