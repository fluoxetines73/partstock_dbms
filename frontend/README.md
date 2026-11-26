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

## Linh kiện và Nhà cung cấp · B

Mở **Linh kiện** hoặc **Nhà cung cấp** và kết nối phiên Quản lý. Các màn hình dùng cùng
phiên với **Danh mục**, gọi API thật để xem, thêm và sửa.

- **Linh kiện:** chọn danh mục và thương hiệu từ UC01, nhập SKU, tên và giá nguyên VND.
  Ô thông số tùy chọn nhận một đối tượng JSON, ví dụ `{"capacity_gb":8}`. Xóa nội dung ô
  thông số khi sửa để bỏ giá trị đã lưu. Có thể mở **Thông số** ngay trên dòng linh kiện.
  Với linh kiện đang kinh doanh, chọn **Ngừng kinh doanh** và xác nhận. Linh kiện vẫn
  xuất hiện trong danh sách Quản lý với trạng thái mới, kể cả sau khi tải lại.
- **Nhà cung cấp:** nhập tên, điện thoại và email tùy chọn. Xóa nội dung một trường liên hệ
  khi sửa để bỏ giá trị đã lưu.

Kịch bản xem, thêm, sửa và đọc lại sau khi tải trang nằm trong
[managed-data.spec.js](tests/managed-data.spec.js) và [demo miền B](../docs/report/demo-mien-b.md#1-uc0203-qua-http-trên-mysql-lab).
Quy tắc xóa và ngừng sử dụng đang được theo dõi trong [đề xuất Q01](../agent/decisions.md#q01-nha-cung-cap).

22/11/2026: **15/15 test Playwright đạt**, gồm 3 ca UC02–03 mới và 12 ca hồi quy,
trên Microsoft Edge với MySQL lab cục bộ. Build frontend và test HTTP UC02–03 cũng đạt.

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
`partstock_uc01_ui_*`, nạp migration/seed 001–003 thật, dùng token test ngẫu nhiên và dọn
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

## Nhập kho và Bán hàng · D

Hai mục **Nhập kho** (UC04) và **Bán hàng** (UC07–08) trong thanh điều hướng, mã ở [DocumentsPage.jsx](src/DocumentsPage.jsx)
và [documents-api.js](src/documents-api.js). Kết nối bằng mã quản lý đã nhập ở **Danh mục**, hoặc nhập mã nhân viên ngay trên trang.
Luồng: tạo chứng từ → chọn nhà cung cấp/khách, thêm dòng → **Lưu nháp** (tồn chưa đổi) → **Xác nhận**. Đơn đã xác nhận có ô lý do
và nút hủy; nút này hiện với cả Nhân viên nhưng máy chủ từ chối (403) và UI giải thích. Một thao tác chạy tại một thời điểm nên bấm đúp
không gửi hai lần; mất mạng khi ghi hiển thị "chưa xác định kết quả" thay vì báo thành công. Danh sách sản phẩm lấy từ tra cứu của C
(tối đa 100 sản phẩm đang bán, kèm tồn).

Test trình duyệt mới ở [documents.spec.js](tests/documents.spec.js) (4 ca): nhập kho lưu nháp rồi xác nhận, xác nhận chứng từ rỗng bị từ chối
và xóa nháp, bán rồi Nhân viên bị từ chối khi hủy và Quản lý hủy hoàn kho, thiếu tồn giữ đơn là nháp. Mỗi ca đối chiếu tồn qua API.
Server test (`backend/tests-db/ui-server.cjs`) giờ nạp thêm migration/seed 003 và mở các route của D, nên test tra cứu của C đọc tồn thật
thay vì fixture. 17/11/2026: **12/12 test trình duyệt đạt** (5 UC01, 4 D, 3 C) và build Vite đạt, trên Windows với Chromium qua
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Chưa kiểm tra ảnh responsive riêng cho hai trang mới.


## UC10 · Cảnh báo tồn kho

Áp migration 004 theo [hướng dẫn database](../database/mysql/README.md#chạy-migration). Nhân viên mở **Cảnh báo tồn kho** và kết nối bằng mã nhân viên để xem linh kiện dưới ngưỡng và linh kiện chưa cấu hình. Quản lý kết nối từ **Danh mục**, chuyển sang **Cảnh báo tồn kho**, chọn SKU, nhập ngưỡng rồi lưu. Để trống để bỏ ngưỡng. Sau khi bán hoặc hủy đơn ở phiên khác, bấm **Tải lại** để đọc tồn mới.
