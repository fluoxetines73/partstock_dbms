# Frontend

## Tra cứu và doanh thu · C

Từ gốc repo, chạy `npm ci --prefix frontend` rồi `npm run dev --prefix frontend`.
Mở Vite, chọn **Tra cứu** hoặc **Doanh thu**, rồi bật **Dùng dữ liệu mẫu** để review
UI độc lập. Chế độ thật gọi các endpoint trong [API contract](../docs/architecture/api-contract.md).
Nhân viên nhập mã tra cứu local. Quản lý kết nối từ **Danh mục**, sau đó chuyển màn hình.
Ngày kết thúc báo cáo là biên loại trừ.

Giao diện dùng React/Vite và CSS thuần. A phụ trách UI UC01, C phụ trách phần
Tra cứu/Doanh thu và điều hướng chung. Phiên bản dependency được cố định
trong `package-lock.json`. Đăng nhập chung cho hai vai trò còn chờ thiết kế.

## Chạy giao diện local

Từ gốc repo, chuẩn bị `.env.docker`, MySQL app, migration và `APP_MANAGER_TOKEN` riêng
theo [backend](../backend/README.md). Backend chạy ở `127.0.0.1:3000`.

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
```

Mở URL Vite in ra (thường `http://127.0.0.1:5173`). Nhập token quản lý của máy mình
vào màn kết nối. Token chỉ ở bộ nhớ trang, không có trong bundle/localStorage/sessionStorage
hay URL; tải lại trang sẽ phải nhập lại. Đây là cơ chế local tạm, chưa phải login/phân quyền
hai actor. Không nhập mật khẩu MySQL vào màn này.

Frontend gọi `/api` cùng origin; Vite proxy sang backend. Backend dùng PORT khác thì đặt
`API_TARGET=http://127.0.0.1:<port>` khi chạy Vite. Không dùng biến `VITE_*` chứa secret.
Build: `npm run build --prefix frontend`. `dist/` chỉ là artifact tĩnh; deployment cần proxy
`/api` cùng origin riêng, Vite preview không cấu hình API production thay nhóm.

## Kiểm thử thật qua trình duyệt → HTTP → MySQL lab

MySQL lab healthy ở 127.0.0.1:3308; có `.env.docker` riêng. Từ gốc repo:

```bash
npm run build --prefix backend
cd frontend
npx playwright install chromium
npm test
```

Nếu đã có Chromium tương thích, đặt `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` tới executable
thay bước tải trình duyệt. Cần OS có các thư viện chạy Chromium. Test tự mở localhost
3101/5174 (phải đang rảnh), không dùng lại server sẵn có. Tạo schema lab ngẫu nhiên
`partstock_uc01_ui_*`, nạp migration/seed 001–002 thật, dùng token test ngẫu nhiên và dọn
schema khi kết thúc. Không ghi/xóa dữ liệu MySQL app hoặc reset lab chung. Hard kill hoặc
dừng ngay khi fixture còn đang khởi tạo (trước khi server lắng nghe) có thể
để sót schema của lượt lỗi; chỉ dọn đúng schema đó sau khi kiểm tra.

15/11: **5/5 test trình duyệt đạt**, build đạt. Bao phủ CRUD hai bảng; tên trùng, độ dài,
FK sản phẩm; sai quyền; lỗi mạng không báo thành công; không lưu token; chống gửi lặp;
Escape/focus; viewport 390 px; bỏ kết quả request cũ khi đổi tab; hồi phục lỗi tải.
Ảnh desktop/mobile được kiểm tra trực quan trong phiên, không phải nghiệm thu thành viên.
Test có cảnh báo màu terminal `NO_COLOR/FORCE_COLOR`, không ảnh hưởng kết quả.

## Bàn giao Khánh (C)

- Component [CatalogPage](src/CatalogPage.jsx) nhận `{ token, onDisconnect }`; gọi API UC01
  đã có. Ghép component vào route/shell chung; màn kết nối ở `main.jsx` chỉ là vỏ demo local.
- Nhờ C rà navigation, quy ước CSS, cơ chế phiên/quyền chung và tài liệu API. Không nhúng
  token chung vào frontend hoặc chọn role trong UI để thay kiểm tra quyền backend.
- Nhờ Tuấn review API/FK và thay đổi thứ tự ID; Hải chạy lại test trên máy thứ hai.
- C tiếp tục khung chung/UC05–06–11; B/D/E tự làm UI miền mình theo ownership.
