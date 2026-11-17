# MySQL

Có môi trường local MySQL app/lab riêng theo [hướng dẫn](../../setup-local-docker.md).
MySQL 8.4.13 đã chạy và kiểm tra hạ tầng trên một máy.
Image đề xuất được cố định theo digest trong `.env.docker.example`, chờ nhóm review cấu hình.
Nhóm cần thiết kế danh mục, thương hiệu, sản phẩm/thông số, nhà cung cấp, chứng từ/dòng nhập,
đơn bán/dòng bán, tồn và biến động kho. Đây là miền dữ liệu dự kiến, chưa là schema được duyệt.
Cần ràng buộc khóa/tham chiếu, tiền/số lượng, trạng thái, giá lịch sử và chiến lược transaction/khóa.
App và lab có kết nối/quyền riêng. Lưu migration có thứ tự, điều kiện áp dụng và cách phục hồi;
không chạy script reset lab bằng credential ứng dụng.

## Chạy migration

Từ thư mục `backend`, chạy `npm run db:setup` để build và áp dụng migration trên MySQL app
theo cấu hình `.env.docker`. Lệnh chỉ tạo bảng và seed được nạp riêng khi cần.

| Trạng thái schema | Migration áp dụng |
|---|---|
| Chưa có bốn bảng UC01–03 | `001_catalogs.sql` → `002_products_suppliers.sql` |
| Đã có `categories` và `brands` | `002_products_suppliers.sql` |
| Đã có đủ bốn bảng | Bỏ qua cả hai migration |

Runner nhận diện hai migration hiện tại theo cặp bảng. Lệnh dừng nếu phát hiện cặp thiếu
bảng, đối tượng là view, hoặc bảng UC02–03 đã có trước UC01. MySQL DDL có thể hoàn tất một
phần khi lỗi giữa chừng. Kiểm tra schema trước khi sửa và chạy lại. Xem
[hướng dẫn seed](../seed/README.md#dữ-liệu-mẫu-uc0203) nếu cần nạp dữ liệu mẫu.

## Miền A — UC01, 11/11/2026

Đã có [migration danh mục/thương hiệu](migrations/001_catalogs.sql), thêm hai bảng.

Tên VARCHAR(100), UNIQUE, utf8mb4_0900_as_ci: phân biệt dấu, không phân biệt hoa/thường.
Khóa BIGINT UNSIGNED; created_at/updated_at DATETIME(3) dùng giờ session MySQL.
B cần cùng kiểu khóa và FK RESTRICT từ products; tính bắt buộc của FK vẫn cần thống nhất.
Không cung cấp lệnh rollback xóa bảng trên app; phục hồi/sửa schema cần rà dữ liệu và phụ thuộc.

Đã áp dụng hai bảng vào app, không nạp seed. Đã kiểm tra trên schema test riêng ở lab,
kể cả FK fixture; chưa nghiệm thu tích hợp sản phẩm thật hoặc có review B.

## Miền B — UC02–03, 13/11/2026

Migration tạo bảng `products` và `suppliers`. Chạy một lần sau `001_catalogs.sql` trên schema
chưa có hai bảng này. Hai FK sang danh mục và thương hiệu dùng `BIGINT UNSIGNED NOT NULL`
và `ON DELETE RESTRICT`. [migrations/002_products_suppliers.sql](migrations/002_products_suppliers.sql)

## Miền D — UC04, UC07, UC08, 17/11/2026

[003_inventory_documents.sql](migrations/003_inventory_documents.sql) tạo `inventory`, `purchase_receipts`, `purchase_receipt_lines`,
`sales_orders`, `sales_order_lines` và `stock_movements` theo [F04](../../docs/architecture/f04-erd-mien-d.md), rồi tạo dòng tồn 0
cho mọi sản phẩm đã có. Chạy sau 002, cùng runner `npm run db:setup`:

| Trạng thái schema | Migration áp dụng |
|---|---|
| Chưa có bảng nào | `001` → `002` → `003` |
| Đã có bốn bảng UC01–03 | `003` |
| Đã có đủ chín bảng | Bỏ qua |

Đã áp dụng thành công hai lần liên tiếp trên schema lab dùng một lần (lần hai không làm gì) với MySQL 8.4.13. Các điều F04 ghi là chưa chạy
thử đã được kiểm tra: `CHECK` đi cùng khóa ngoại `RESTRICT` trên `stock_movements` hợp lệ, khóa ngoại ghép `(dòng, sản phẩm)` hoạt động.
`stock_movements.stock_count_line_id` chưa có khóa ngoại vì bảng kiểm kê thuộc E. Mốc `confirmed_at`/`cancelled_at`/`occurred_at`
do backend ghi theo giờ Việt Nam. Không có lệnh rollback xóa bảng; việc đó mất chứng từ và lịch sử nên cần rà dữ liệu trước.
Chưa áp dụng vào MySQL app `partstock`; đang chờ review.
