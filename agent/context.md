# Ngữ cảnh ngắn

PartStock, BTL DBMS HCMUT, 5 sinh viên A–E; A trưởng nhóm. Deadline 30/11/2026, giờ LMS.
Kế hoạch gốc bắt đầu 04/11/2026. Cập nhật 11/11: hiện là Sprint 2 (09–15/11).
Hoàn tất phần tồn Sprint 1 và toàn bộ Sprint 2 chậm nhất 15/11, trước thứ Hai 16/11:
đủ chức năng, lab hai hệ, backup/restore kiểm chứng và báo cáo bản đầu.
Thiết kế chung 11/11; nền 12/11; bản đầu 13/11; gói cá nhân 14/11; nghiệm thu 15/11.
Sprint 3 (16–22/11) hoàn thiện sau nghiệm thu; Sprint 4 (23–29/11) chuẩn bị bản nộp.
Năm gói cá nhân, giữ ownership; review B→A, C→B, A→C, D↔E. Không đặt lịch họp.
Đây là mục tiêu, không ghi nhận đã hoàn thành. Bản nháp F03/F04 miền D ở commit daf1f1e,
nhánh docs/f03-f04-inventory-transactions, chưa có trên main tại lần rà; chờ review/chốt.
Ứng dụng MySQL cho một cửa hàng/một kho, MongoDB cho thực nghiệm. Stack định hướng:
React/Vite, Express/TypeScript, Docker Compose. Đã có bộ Docker local và script kiểm tra hạ tầng:
xem [setup](../setup-local-docker.md), [kết quả](../KIEM-TRA.md). Đã chạy trên một máy, chờ review
và máy thành viên khác xác minh. Nhánh docs/a-sprint1-foundation đã có khung backend,
API/schema/seed UC01 và ERD miền A; build và 11 test đạt, kiểm tra CRUD/FK fixture trên lab đạt.
Hai bảng đã tạo trên app local, không nạp seed. Còn UI, phân quyền chung, FK sản phẩm thật,
review B, hợp nhất ERD và lab Storage; chưa nghiệm thu/merge. Xem todo A và backend/README.md.

[Requirements](../docs/requirements.md) là nguồn nghiệp vụ/rubric; [ownership](../docs/ownership.md)
là nguồn phân công; [plan](../docs/plan.md) là nguồn sprint. [Decisions](decisions.md) tách đã chốt/đề xuất/còn mở.
Phụ thuộc triển khai: cấu trúc/schema/API và quy tắc chung → seed/mock → module độc lập.
C/D/E dùng dữ liệu mẫu, không chờ CRUD người trước; nghiệm thu vẫn cần tích hợp thật.
D–E thống nhất cơ chế kho; B–D kiểm tra điều kiện transaction MongoDB.
Mỗi người phải có script, bằng chứng, phân tích trên cả hai DBMS, không chỉ lý thuyết.
