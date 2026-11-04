# Quy tắc bổ sung cho thực nghiệm

Áp dụng cùng AGENTS.md ở root. Chỉ dùng lab với kết nối/cấu hình/quyền tách app;
trước thao tác reset/mất dữ liệu phải xác minh đúng đích lab, không dựa vào tên DB đơn thuần.
Mỗi chủ đề cần script hai hệ, dữ liệu tái tạo, điều kiện, bằng chứng thô phù hợp và phân tích.
Không bịa kết quả; README hiện là kế hoạch chưa triển khai. Kiểm tra phiên bản/cấu hình trước
khi khẳng định tính năng; đặc biệt topology MongoDB cho transaction.
So cùng dữ liệu/nghiệp vụ logic, ghi khác biệt model, index và phạm vi kết luận.
Đo hiệu năng ghi phiên bản/cấu hình, quy mô, index, cache, số lần chạy; một lượt không đủ kết luận chung.
Giữ kết quả tổng hợp nhỏ và script trong Git; backup/dump, dữ liệu lớn vào vùng ignore.
Backup/restore phải khôi phục DB sạch và đối chiếu; không coi recovery nội bộ là backup.
