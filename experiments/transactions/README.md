# Transaction

## Mục tiêu và owner
Kiểm chứng cơ chế Transaction trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner: **D**. Trạng thái: **chưa triển khai**, chưa có script/lệnh chạy/kết quả.

## Câu hỏi cần kiểm chứng
Commit/rollback có giữ chứng từ–tồn–biến động nhất quán khi lỗi giữa chừng?

## Kịch bản dự kiến
- MySQL: Xác nhận nhập/bán trong transaction; chèn lỗi sau cập nhật tồn trước ghi lịch sử; kiểm tra rollback và ca commit.
- MongoDB: Thử transaction nhiều document với cấu hình hỗ trợ đã được B–D xác minh; chèn lỗi tại vị trí tương đương.

## Đầu vào
Seed chứng từ nháp, tồn biết trước và điểm gây lỗi có thể tái tạo.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Log trình tự, trạng thái trước/sau, commit/rollback và kiểm tra bất biến; ghi phiên bản/topology và giới hạn.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chưa có lệnh reset. Khi triển khai: xác minh đích lab bằng cấu hình/kết nối/quyền riêng,
kết thúc các phiên thử, tạo lại dữ liệu thử từ seed đã biết và đối chiếu baseline trước lần tiếp.
Không chạy reset trên database ứng dụng; backup/dump và artifact lớn không commit.
