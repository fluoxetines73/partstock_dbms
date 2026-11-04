# Hướng dẫn coding agent

## Mục tiêu và nguồn sự thật

PartStock có hai phần: ứng dụng nội bộ dùng MySQL và thực nghiệm so sánh MySQL/MongoDB.
Deadline 30/11/2026, giờ LMS. Không xây ứng dụng MongoDB thứ hai hay đồng bộ hai hệ.
Đọc [yêu cầu](docs/requirements.md), [ownership](docs/ownership.md), [plan](docs/plan.md),
[context](agent/context.md) và [decisions](agent/decisions.md) trước khi sửa.
Yêu cầu là nguồn phạm vi/nghiệp vụ; ownership là nguồn phân công; plan là nguồn mốc;
decisions ghi trạng thái quyết định. Nếu mâu thuẫn, ghi rõ và đưa nhóm chốt, không tự đổi.

## Bản đồ nhiệm vụ

- UI: frontend/README.md; API/nghiệp vụ: backend/README.md.
- Schema/migration/seed dùng chung: database/ và README tương ứng.
- Thực nghiệm: experiments/README.md, experiments/AGENTS.md và README chủ đề.
- Thiết kế: docs/architecture/README.md; báo cáo: docs/report/outline.md.
- Bàn giao: agent/handoff-template.md. agent/ chỉ là tài liệu, không tự khởi tạo hệ đa tác tử.

## Phạm vi thay đổi

React + Vite; Node.js + Express + TypeScript; MySQL cho app, MongoDB cho lab; Docker Compose.
Phiên bản, UI library, cách truy cập DB/ORM, schema/API và chi tiết hủy/doanh thu còn mở.
Hiện chỉ scaffold tài liệu, chưa thiết lập lệnh chạy/test. Không tự cài dependency hoặc tạo cấu hình giả.
Sửa nhỏ, đúng task, giữ thay đổi có sẵn, không tự mở rộng tính năng; cập nhật tài liệu bị ảnh hưởng.
Không khóa file theo owner. Thay đổi phạm vi/schema/API/quy tắc chung phải ghi quyết định để nhóm thống nhất;
không cần xin A cho mọi chỉnh sửa nhỏ đã được yêu cầu.

## Database và kiểm chứng

Đặt schema/migration/seed trong database/, tránh migration phá dữ liệu.
Tên dự kiến app `partstock`, lab `partstock_lab`; phải tách kết nối, cấu hình và credential/quyền,
không chỉ dựa vào tên. Không chạy thử phá hủy trên database ứng dụng. Không hardcode bí mật.
Chứng từ nháp không đổi kho; xác nhận/hủy/kiểm kê phải nhất quán chứng từ–tồn–biến động;
không bán âm, không hoàn kho lặp. D–E thống nhất một cơ chế kho.
Chỉ công bố test/demo thực sự đã chạy; chưa có lệnh thì ghi chưa thiết lập.
Không bịa benchmark, thời gian, ảnh chụp hay kết luận hệ nào thắng.

## Git và bàn giao

Nhánh theo task, PR và review theo CONTRIBUTING.md; code A cũng cần người khác review.
Không tự push/merge, đổi branch protection hoặc tạo remote khi chưa được yêu cầu.
Bàn giao file đổi, cách kiểm tra, kết quả thật, thiếu sót, phụ thuộc và quyết định cần nhóm chốt.
