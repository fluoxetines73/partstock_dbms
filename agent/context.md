# Ngữ cảnh ngắn

PartStock, BTL DBMS HCMUT, 5 sinh viên A–E; A trưởng nhóm. Deadline 30/11/2026, giờ LMS.
Kế hoạch gốc bắt đầu 04/11/2026; không tự đánh dấu mốc xong khi ngày thay đổi.
Kế hoạch được rà lại ngày 10/11: F01 rà hiện trạng chuyển từ 09/11 sang 10/11;
thiết kế hạn 10/11, nền tảng 12/11, tích hợp 15/11, đủ phạm vi/báo cáo bản đầu 22/11.
Dợt 25/11, tổng duyệt 27/11, kiểm tra ZIP 28/11, đóng băng 29/11; chưa ghi nhận các mốc đã đạt.
Ứng dụng MySQL cho một cửa hàng/một kho, MongoDB cho thực nghiệm. Stack định hướng:
React/Vite, Express/TypeScript, Docker Compose. Đã có bộ Docker local và script kiểm tra hạ tầng:
xem [setup](../setup-local-docker.md), [kết quả](../KIEM-TRA.md). Đã chạy trên một máy, chờ review
và máy thành viên khác xác minh. Chưa có app/schema/seed nghiệp vụ hoặc lệnh test ứng dụng.

[Requirements](../docs/requirements.md) là nguồn nghiệp vụ/rubric; [ownership](../docs/ownership.md)
là nguồn phân công; [plan](../docs/plan.md) là nguồn sprint. [Decisions](decisions.md) tách đã chốt/đề xuất/còn mở.
Phụ thuộc: schema/API → sản phẩm/nhà cung cấp → nhập/bán → lịch sử/doanh thu.
D–E thống nhất cơ chế kho; B–D kiểm tra điều kiện transaction MongoDB.
Mỗi người phải có script, bằng chứng, phân tích trên cả hai DBMS, không chỉ lý thuyết.
