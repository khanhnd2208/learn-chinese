# Auth & homepage smoke

> Split from manual QA spec. See [README](README.md) for index.

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
