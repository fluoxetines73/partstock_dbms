# MySQL

Chưa có schema/migration nghiệp vụ. Có môi trường local MySQL app/lab riêng theo
[hướng dẫn](../../setup-local-docker.md); MySQL 8.4.13 đã chạy và kiểm tra hạ tầng trên một máy.
Image đề xuất được cố định theo digest trong `.env.docker.example`, chờ nhóm review cấu hình.
Nhóm cần thiết kế danh mục, thương hiệu, sản phẩm/thông số, nhà cung cấp, chứng từ/dòng nhập,
đơn bán/dòng bán, tồn và biến động kho. Đây là miền dữ liệu dự kiến, chưa là schema được duyệt.
Cần ràng buộc khóa/tham chiếu, tiền/số lượng, trạng thái, giá lịch sử và chiến lược transaction/khóa.
App và lab có kết nối/quyền riêng. Lưu migration có thứ tự, điều kiện áp dụng và cách phục hồi;
không chạy script reset lab bằng credential ứng dụng.

## Miền A — UC01, 11/11/2026

Đã có [migration danh mục/thương hiệu](migrations/001_catalogs.sql), thêm hai bảng,
không sửa dữ liệu cũ. Chạy từ backend bằng `npm run db:setup` trên schema chưa có hai bảng;
không tự chạy lại nếu có lỗi một phần (DDL không rollback cả file). Chưa có migration tracker;
B cần hợp nhất cách đánh số/theo dõi với các miền khác. Chưa có schema sản phẩm/kho/chứng từ.

Tên VARCHAR(100), UNIQUE, utf8mb4_0900_as_ci: phân biệt dấu, không phân biệt hoa/thường.
Khóa BIGINT UNSIGNED; created_at/updated_at DATETIME(3) dùng giờ session MySQL.
B cần cùng kiểu khóa và FK RESTRICT từ products; tính bắt buộc của FK vẫn cần thống nhất.
Không cung cấp lệnh rollback xóa bảng trên app; phục hồi/sửa schema cần rà dữ liệu và phụ thuộc.

Đã áp dụng hai bảng vào app, không nạp seed. Đã kiểm tra trên schema test riêng ở lab,
kể cả FK fixture; chưa nghiệm thu tích hợp sản phẩm thật hoặc có review B.
