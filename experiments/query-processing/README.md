# Query processing

## Mục tiêu và owner
Kiểm chứng cơ chế Query processing trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner: **C**. Trạng thái: **chưa triển khai**, chưa có script/lệnh chạy/kết quả.

## Câu hỏi cần kiểm chứng
Hai hệ chọn và thực hiện kế hoạch tra cứu/tổng hợp thế nào?

## Kịch bản dự kiến
- MySQL: Phân tích EXPLAIN và số đo thực thi phù hợp phiên bản cho lọc/join/subquery/doanh thu.
- MongoDB: Phân tích explain và execution statistics của find/aggregation tương đương, kể cả lookup khi phù hợp model.

## Đầu vào
Cùng khoảng thời gian, điều kiện lọc và kết quả nghiệp vụ mong đợi.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Kế hoạch thực thi trước/sau điều chỉnh, operator/stage, số quét, thời gian và đối chiếu kết quả; không chỉ ghi thời gian.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chưa có lệnh reset. Khi triển khai: xác minh đích lab bằng cấu hình/kết nối/quyền riêng,
kết thúc các phiên thử, tạo lại dữ liệu thử từ seed đã biết và đối chiếu baseline trước lần tiếp.
Không chạy reset trên database ứng dụng; backup/dump và artifact lớn không commit.
