# PartStock

**PartStock — Hệ thống quản lý bán hàng và tồn kho linh kiện máy tính**.
Bài tập lớn Database Management Systems, HCMUT, Học kỳ 261.

Đề tài: **So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**.

## Trạng thái

**Pilot bảng tiến độ:** mở `docs/status/index.html` bằng trình duyệt sau khi checkout
nhánh có pilot. Trang hiển thị phần việc A–E từ repo. Xem [cách cập nhật](CONTRIBUTING.md#pilot-bảng-tiến-độ).

Đã có bộ môi trường Docker local cho MySQL app, MySQL lab và MongoDB lab, kèm script tạo
credential riêng và kiểm tra hạ tầng. Trên một máy đã kiểm chứng container healthy,
commit/rollback, giữ dữ liệu qua tạo lại container và kết nối DBeaver; xem [kết quả](KIEM-TRA.md).
Bộ cấu hình đang chờ review và tái tạo trên máy thành viên khác, chưa là nghiệm thu toàn nhóm.
Ngày 16/11, nhánh review đã có UI/API/schema UC01 của A, API/schema UC02–03 của B,
lab Storage của A và Indexing/backup-restore của B. Đã ghép F02 và nháp F03/F04 của Nam;
chưa có đầy đủ 12 UC, năm bài lab, hai actor được thực thi hoặc nghiệm thu nhóm.
Main chưa nhận bản này. [Bàn giao hiện tại](docs/handoffs/a-acceptance-2026-11-16.md) có
reviewer, bằng chứng và việc còn lại; [báo cáo bản đầu](docs/report/draft-integrated.md).

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

Bước tiếp theo: review phần đã bàn giao, tái tạo máy thứ hai và hoàn thiện phần tồn mốc 15/11
theo [kế hoạch](docs/plan.md). [Chạy UI UC01](frontend/README.md), [chạy backend](backend/README.md),
[demo A](docs/report/demo-mien-a.md). Code hiện dùng React/Vite/CSS thuần, Express/TypeScript
và mysql2/SQL trực tiếp; lựa chọn chung và phân quyền còn cần nhóm review.

Sản phẩm nộp: PDF báo cáo, mã nguồn/ứng dụng chạy được, script/demo hai hệ, hướng dẫn chạy,
kết quả thực nghiệm, đóng góp từng người và biên bản. Mỗi người trình bày phần mình; slide không bắt buộc.
