# Concurrency control

## Mục tiêu và owner
Kiểm chứng cơ chế Concurrency control trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner: **E**. Trạng thái: **chưa triển khai**, chưa có script/lệnh chạy/kết quả.

## Câu hỏi cần kiểm chứng
Nhiều phiên bán lượng tồn cuối có gây bán vượt tồn hoặc mất cập nhật?

## Kịch bản dự kiến
- MySQL: Cho ít nhất hai phiên cạnh tranh tồn cuối theo cơ chế transaction/khóa được D–E chốt; ghi lịch xen kẽ và xử lý chờ/lỗi.
- MongoDB: Cho nhiều phiên cạnh tranh cùng tồn theo thao tác có điều kiện/transaction phù hợp cấu hình đã xác minh.

## Đầu vào
Seed tồn cuối biết trước, đơn cạnh tranh, lịch bắt đầu và số phiên được ghi lại.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Log từng phiên, lịch xen kẽ, lỗi/chờ/thử lại nếu có, kết quả đơn và tồn; xác minh tồn không âm, bán thành công không vượt tồn, lịch sử khớp.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chưa có lệnh reset. Khi triển khai: xác minh đích lab bằng cấu hình/kết nối/quyền riêng,
kết thúc các phiên thử, tạo lại dữ liệu thử từ seed đã biết và đối chiếu baseline trước lần tiếp.
Không chạy reset trên database ứng dụng; backup/dump và artifact lớn không commit.
