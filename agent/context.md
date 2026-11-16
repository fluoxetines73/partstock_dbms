# Ngữ cảnh ngắn

PartStock, BTL DBMS HCMUT, 5 sinh viên A–E; A trưởng nhóm. Deadline 30/11/2026, giờ LMS.
Kế hoạch gốc bắt đầu 04/11/2026. Cập nhật 16/11: đã sang Sprint 3 (16–22/11),
nhưng mục tiêu đủ Sprint 1–2 trước 16/11 chưa đạt. Giữ phần thiếu là công việc còn tồn:
đủ chức năng, lab hai hệ, backup/restore kiểm chứng và báo cáo bản đầu.
Thiết kế chung 11/11; nền 12/11; bản đầu 13/11; gói cá nhân 14/11; nghiệm thu 15/11.
Sprint 3 (16–22/11) hoàn thiện sau nghiệm thu; Sprint 4 (23–29/11) chuẩn bị bản nộp.
Năm gói cá nhân, giữ ownership; review B→A, C→B, A→C, D↔E. Không đặt lịch họp.
Đây là mục tiêu, không ghi nhận đã hoàn thành. F02 `229aa11` và bản nháp Nam `6729842`
đã ghép giữ lịch sử trên integration/a-sprint2-review, chưa vào main; chờ review/chốt.
Ứng dụng MySQL cho một cửa hàng/một kho, MongoDB cho thực nghiệm. Stack định hướng:
React/Vite, Express/TypeScript, Docker Compose. Đã có bộ Docker local và script kiểm tra hạ tầng:
xem [setup](../setup-local-docker.md), [kết quả](../KIEM-TRA.md). Đã chạy trên một máy, chờ review
và máy thành viên khác xác minh. Nhánh feat/a-uc01-acceptance đã push UI/API UC01,
test với FK products thật của B, sửa ID số/focus: 11 backend test, 5 browser test,
integration UC01/UC02–03 và build đạt. React/Vite được người dùng cho phép cài;
CatalogPage tách để C ghép shell chung. Token quản lý local chưa là hai actor đầy đủ.
Lab Storage đã push experiment/a-storage-management, có kết quả năm pha và chương báo cáo.
Còn review B/C, tái tạo độc lập và dữ liệu/thiết kế miền E/C để hoàn tất bản chung.
[ERD tổng hợp](../docs/architecture/erd-integrated-review.md) phân biệt DDL A/B và nháp D/E.
[Bàn giao](../docs/handoffs/a-acceptance-2026-11-16.md) có demo, PR/comment soạn sẵn và người nhận;
chưa đăng PR/comment vì chưa có phiên GitHub API/browser. SSH push hoạt động; main giữ dbc806f.
Không force-push docs/a-sprint1-foundation local đã rebase khác remote; B kế thừa bản cũ 24db24b.

[Requirements](../docs/requirements.md) là nguồn nghiệp vụ/rubric; [ownership](../docs/ownership.md)
là nguồn phân công; [plan](../docs/plan.md) là nguồn sprint. [Decisions](decisions.md) tách đã chốt/đề xuất/còn mở.
Phụ thuộc triển khai: cấu trúc/schema/API và quy tắc chung → seed/mock → module độc lập.
C/D/E dùng dữ liệu mẫu, không chờ CRUD người trước; nghiệm thu vẫn cần tích hợp thật.
D–E thống nhất cơ chế kho; B–D kiểm tra điều kiện transaction MongoDB.
Mỗi người phải có script, bằng chứng, phân tích trên cả hai DBMS, không chỉ lý thuyết.
