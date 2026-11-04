# PartStock

**PartStock — Hệ thống quản lý bán hàng và tồn kho linh kiện máy tính**.
Bài tập lớn Database Management Systems, HCMUT, Học kỳ 261.

Đề tài: **So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**.

## Trạng thái

Đây là scaffold tài liệu: đã tạo cấu trúc cộng tác, kế hoạch và hướng dẫn agent.
Chưa có ứng dụng, dependency, schema, script thực nghiệm hay môi trường chạy.
Chưa thiết lập lệnh cài đặt, chạy, test hoặc demo; chưa có kết quả thực nghiệm.
Không suy ra tiến độ triển khai từ sự tồn tại của các thư mục.

## Mục tiêu

Ứng dụng nội bộ một cửa hàng, một kho, chạy trên MySQL. MongoDB dùng đối chiếu thực nghiệm;
không xây ứng dụng thứ hai hay đồng bộ hai database. Luồng: linh kiện → nhập → bán → tồn → báo cáo.
Mỗi thành viên nghiên cứu chủ đề của mình trên cả hai hệ, có script, bằng chứng và phân tích.
Backup/restore bổ sung trên hai hệ, không thay thế năm chủ đề và không mặc nhiên có bonus.

## Đọc từ đây

- [Yêu cầu và bảng bằng chứng](docs/requirements.md), [phân công](docs/ownership.md), [kế hoạch](docs/plan.md).
- [Quy ước cộng tác](CONTRIBUTING.md), [hướng dẫn agent](AGENTS.md).
- [Frontend](frontend/README.md), [backend](backend/README.md), [database](database/README.md).
- [Thực nghiệm](experiments/README.md), [kiến trúc](docs/architecture/README.md), [báo cáo](docs/report/outline.md).
- [Ngữ cảnh agent](agent/context.md), [quyết định](agent/decisions.md).

Bước tiếp theo: A tổ chức chốt schema/API và quy tắc kho; B triển khai môi trường sau khi nhóm
chọn phiên bản/cấu hình; cả nhóm làm theo Sprint 1. Stack định hướng React + Vite,
Node.js + Express + TypeScript, MySQL, MongoDB và Docker Compose; chưa chọn UI library hay ORM.

Sản phẩm nộp: PDF báo cáo, mã nguồn/ứng dụng chạy được, script/demo hai hệ, hướng dẫn chạy,
kết quả thực nghiệm, đóng góp từng người và biên bản. Mỗi người trình bày phần mình; slide không bắt buộc.
