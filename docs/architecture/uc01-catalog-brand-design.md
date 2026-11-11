# UC01 — Danh mục và thương hiệu

Bản nháp của A ngày 11/11/2026, chờ B review dữ liệu và C rà API.
Theo [yêu cầu](../requirements.md), [plan](../plan.md) và hai actor trong F02
trên nhánh `docs/f02-use-case-plan`. Đã triển khai bản đầu: migration và API CRUD, 11 test đạt và kiểm tra MySQL lab đạt.
Chưa có UI, phân quyền chung hoặc review B/C.

Quản lý có thể xem, thêm, sửa tên và xóa danh mục/thương hiệu chưa được sản phẩm sử dụng.
Tên không được rỗng hoặc trùng trong cùng danh sách. Mục đã được sản phẩm sử dụng thì
báo không thể xóa; đổi tên vẫn giữ liên kết. Các thao tác này không thay đổi tồn kho.

Đề xuất hai bảng phẳng, không phân cấp:

| Bảng | Các cột |
|---|---|
| categories | id, name, created_at, updated_at |
| brands | id, name, created_at, updated_at |

B đối chiếu `category_id` và `brand_id` trong bảng sản phẩm. Dùng khóa ngoại để giữ liên kết;
không xóa dây chuyền sản phẩm. Kiểu khóa, cách so sánh tên trùng và quan hệ bắt buộc hay
không sẽ thống nhất với B khi ghép schema. Cách ngừng dùng mục đang tham chiếu vẫn còn mở.

API đề xuất giống nhau cho `categories` và `brands`:

| Thao tác | API |
|---|---|
| Xem danh sách | GET /api/categories |
| Thêm | POST /api/categories với name |
| Sửa tên | PATCH /api/categories/:id với name |
| Xóa | DELETE /api/categories/:id |

Thay `categories` bằng `brands` cho thương hiệu. C hợp nhất response/lỗi và nhu cầu
đọc danh sách của Nhân viên; quyền sửa thuộc Quản lý và phải kiểm tra ở backend.
Cơ chế nhận diện vai trò dùng theo thiết kế chung, chưa được triển khai.

Khi có code, kiểm tra: thêm/xem/sửa/xóa thành công; từ chối tên rỗng/trùng; không xóa mục
đang được dùng; đổi tên giữ liên kết; từ chối người không có quyền sửa; lỗi DB không báo
thành công. UNIQUE/FK cần bảo vệ cả khi có yêu cầu đồng thời. Ghi kết quả thật khi chạy.

Bước tiếp theo: đối chiếu bản nháp với B/C, ghi lựa chọn được xác nhận vào
[sổ quyết định](../../agent/decisions.md), rồi triển khai theo công cụ backend đã thống nhất.


Lựa chọn triển khai 11/11: BIGINT UNSIGNED, name VARCHAR(100), DATETIME(3), collation
utf8mb4_0900_as_ci; API trả id chuỗi. Token Quản lý local qua APP_MANAGER_TOKEN là tạm thời,
chưa thay thiết kế danh tính/hai actor chung. Tên được trim và chuẩn hóa NFC.
Các lựa chọn này cần B/C review khi hợp nhất; không ghi nhận đồng thuận nhóm.
