# PartStock

**PartStock — Hệ thống quản lý bán hàng và tồn kho linh kiện máy tính**.
Bài tập lớn Database Management Systems, HCMUT, Học kỳ 261.

Đề tài: **So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**.

## Trạng thái

Đã có bộ môi trường Docker local cho MySQL app, MySQL lab và MongoDB lab, kèm script tạo
credential riêng và kiểm tra hạ tầng. Trên một máy đã kiểm chứng container healthy,
commit/rollback, giữ dữ liệu qua tạo lại container và kết nối DBeaver; xem [kết quả](KIEM-TRA.md).
Bộ cấu hình đang chờ review và tái tạo trên máy thành viên khác, chưa là nghiệm thu toàn nhóm.
Chưa có ứng dụng, schema/migration/seed nghiệp vụ, năm bài thực nghiệm đầy đủ hoặc benchmark.
Không suy ra tiến độ triển khai từ sự tồn tại của các thư mục.

## Chạy môi trường database local

Làm theo [hướng dẫn setup cho thành viên](setup-local-docker.md), từ clone repo, bật Docker,
tạo `.env.docker`/keyfile riêng, khởi động, kiểm tra đến kết nối DBeaver.
Mỗi người có dữ liệu local riêng; không đồng bộ database giữa các máy.
Chỉ commit `.env.docker.example`, không commit `.env.docker`, `.mongodb/`, volume hoặc backup.

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

Bước tiếp theo: review và tái tạo môi trường trên máy thứ hai; A tổ chức chốt schema/API,
quy tắc kho và cấu hình chung theo sổ quyết định; cả nhóm làm theo Sprint 1. Stack định hướng React + Vite,
Node.js + Express + TypeScript, MySQL, MongoDB và Docker Compose; chưa chọn UI library hay ORM.

Sản phẩm nộp: PDF báo cáo, mã nguồn/ứng dụng chạy được, script/demo hai hệ, hướng dẫn chạy,
kết quả thực nghiệm, đóng góp từng người và biên bản. Mỗi người trình bày phần mình; slide không bắt buộc.
