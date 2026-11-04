# Backup/restore

## Mục tiêu và owner
Kiểm chứng cơ chế Backup/restore trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner: **B; E kiểm chứng cùng B**. Trạng thái: **chưa triển khai**, chưa có script/lệnh chạy/kết quả.

## Câu hỏi cần kiểm chứng
Backup có phục hồi đủ dữ liệu và tổng nghiệp vụ trên DB sạch?

## Kịch bản dự kiến
- MySQL: Chọn công cụ backup phù hợp phiên bản, giữ dữ liệu không thay đổi, ghi thời gian/kích thước; giả lập mất dữ liệu lab và restore DB sạch.
- MongoDB: Chọn công cụ dump/restore phù hợp phiên bản/topology, cùng điều kiện dữ liệu đứng yên; restore vào lab sạch.

## Đầu vào
Cùng snapshot logic đã biết số lượng sản phẩm/chứng từ/dòng và tổng tồn/tổng tiền.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Lệnh/cấu hình đã che bí mật, log backup/restore, thời gian/kích thước, đối chiếu số lượng và tổng nghiệp vụ trước/sau; B thực hiện, E xác minh.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chưa có lệnh reset. Khi triển khai: xác minh đích lab bằng cấu hình/kết nối/quyền riêng,
kết thúc các phiên thử, tạo lại dữ liệu thử từ seed đã biết và đối chiếu baseline trước lần tiếp.
Không chạy reset trên database ứng dụng; backup/dump và artifact lớn không commit.

## Giới hạn bài bổ sung
Dữ liệu không thay đổi trong lúc backup. Chỉ giả lập mất dữ liệu trên lab đã xác minh;
restore vào DB sạch tách app, đối chiếu số lượng và tổng nghiệp vụ bằng kiểm tra độc lập của E.
Recovery nội bộ DBMS khác backup/restore quản trị. Không triển khai replication/failover/PITR;
phần này không thay thế năm chủ đề và không mặc nhiên bảo đảm bonus.
