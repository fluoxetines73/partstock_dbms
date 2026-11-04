# Storage & management

## Mục tiêu và owner
Kiểm chứng cơ chế Storage & management trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner: **A**. Trạng thái: **chưa triển khai**, chưa có script/lệnh chạy/kết quả.

## Câu hỏi cần kiểm chứng
DBMS tổ chức và quản lý dữ liệu vật lý thế nào khi dữ liệu tăng?

## Kịch bản dự kiến
- MySQL: Khảo sát metadata bảng/index, dung lượng và cấu trúc lưu trữ của engine được chọn trước/sau nạp dữ liệu.
- MongoDB: Khảo sát metadata collection/index, thống kê lưu trữ và cơ chế engine theo phiên bản trước/sau nạp.

## Đầu vào
Seed sản phẩm, chứng từ và dòng hàng ở nhiều quy mô đã ghi rõ.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Metadata, kích thước data/index, cấu hình engine và giải thích tổ chức lưu trữ; ERD không đủ.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chưa có lệnh reset. Khi triển khai: xác minh đích lab bằng cấu hình/kết nối/quyền riêng,
kết thúc các phiên thử, tạo lại dữ liệu thử từ seed đã biết và đối chiếu baseline trước lần tiếp.
Không chạy reset trên database ứng dụng; backup/dump và artifact lớn không commit.
