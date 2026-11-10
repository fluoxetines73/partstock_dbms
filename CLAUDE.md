# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Quy tắc làm việc chính cho agent nằm ở [AGENTS.md](AGENTS.md) (và [experiments/AGENTS.md](experiments/AGENTS.md)
khi sửa thực nghiệm); đọc trước khi sửa. File này chỉ bổ sung lệnh và bức tranh kiến trúc.

## Hiện trạng repo

PartStock — BTL DBMS HCMUT HK261, nhóm 5 người A–E, deadline 30/11/2026. Repo hiện **chủ yếu là tài liệu**
cộng với môi trường Docker local cho database. Chưa có frontend/backend, `package.json`, schema/migration/seed
nghiệp vụ, script thực nghiệm hay benchmark; vì vậy **chưa có lệnh build, lint hay test ứng dụng**.
Đừng suy ra tiến độ từ việc thư mục tồn tại — các README trong `frontend/`, `backend/`, `database/*`,
`experiments/*` là kế hoạch. Khi thêm lệnh thật, cập nhật file này và README liên quan.

Tài liệu viết bằng tiếng Việt; giữ nguyên ngôn ngữ đó khi sửa tài liệu.

## Lệnh môi trường database local (PowerShell, Windows + Docker Desktop)

Chi tiết đầy đủ và cách xử lý lỗi: [setup-local-docker.md](setup-local-docker.md). Kết quả kiểm chứng thật: [KIEM-TRA.md](KIEM-TRA.md).

```powershell
# Một lần: sinh .env.docker (mật khẩu ngẫu nhiên) và .mongodb/keyfile; chạy lại không ghi đè
powershell -NoProfile -ExecutionPolicy Bypass -File .\database\local\prepare.ps1

# Mọi lệnh compose đều cần cặp cờ này
docker compose --env-file .env.docker -f compose.local.yaml config --quiet
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait
docker compose --env-file .env.docker -f compose.local.yaml ps
docker compose --env-file .env.docker -f compose.local.yaml stop
docker compose --env-file .env.docker -f compose.local.yaml logs --tail 100 mongo-lab

# Sau lần khởi động đầu: khởi tạo replica set rs0 + user lab (chạy bằng admin, nhập mật khẩu khi hỏi)
docker compose --env-file .env.docker -f compose.local.yaml exec mongo-lab mongosh --host 127.0.0.1 --username admin --authenticationDatabase admin --file /opt/partstock/init-mongo.js --password

# Kiểm tra hạ tầng (không phải test nghiệp vụ): transaction 2 document trên MongoDB lab
docker compose --env-file .env.docker -f compose.local.yaml exec mongo-lab mongosh "mongodb://127.0.0.1:27017/partstock_lab?replicaSet=rs0&directConnection=true" --username partstock_lab --authenticationDatabase partstock_lab --file /opt/partstock/check-mongo.js --password
```

Kiểm tra commit/rollback MySQL lab: đăng nhập `mysql-lab` bằng `partstock_lab` rồi chạy nội dung
`/opt/partstock/check-mysql.sql` (đã mount vào container). Các lệnh `exec` cần nhập mật khẩu tương tác
(lấy từ `.env.docker`), nên agent thường không tự chạy được; không in hay ghi mật khẩu ra output/tài liệu.

**Không dùng `down -v`** để reset lab: compose có cả volume của app, lệnh này xóa luôn dữ liệu ứng dụng.
Chưa có lệnh reset an toàn; reset phải nhắm riêng đúng đích lab và kiểm tra trước.

## Kiến trúc

Hai luồng hoàn toàn tách biệt, không đồng bộ dữ liệu giữa chúng:

- **Ứng dụng** (dự kiến): React + Vite → Express + TypeScript → MySQL `partstock` (dịch vụ `mysql-app`).
  Một cửa hàng, một kho; 12 use case UC01–UC12 trong [docs/requirements.md](docs/requirements.md).
- **Thực nghiệm**: script lab → MySQL `partstock_lab` (`mysql-lab`) hoặc MongoDB `partstock_lab` (`mongo-lab`).
  Năm chủ đề (storage, indexing, query-processing, transactions, concurrency) + backup-restore bổ sung,
  mỗi chủ đề một thư mục trong `experiments/`, phải có script và bằng chứng trên cả hai hệ.

Topology trong [compose.local.yaml](compose.local.yaml):

| Dịch vụ | Cổng host | Network | Ghi chú |
|---|---|---|---|
| `mysql-app` | 127.0.0.1:3307 | `app` | user `partstock_app`, chỉ cho ứng dụng |
| `mysql-lab` | 127.0.0.1:3308 | `lab` | user `partstock_lab`; từ chối user app (đã kiểm chứng) |
| `mongo-lab` | 127.0.0.1:27018 → 27017 | `lab` | replica set `rs0` một node, keyfile auth — cần cho transaction nhiều document |

App và lab tách dịch vụ, credential, network và volume — không chỉ khác tên database. Image được ghim theo
digest trong `.env.docker.example` (MySQL 8.4.13, MongoDB 8.0.34). Bên trong container dùng cổng 27017;
từ Windows/DBeaver dùng 27018 với `directConnection=true`. Backend chạy trong container sau này sẽ dùng
tên service, không dùng `127.0.0.1:3307`.

Mối phụ thuộc giữa các phần: schema/API → sản phẩm/nhà cung cấp → nhập/bán → lịch sử kho/doanh thu.
Schema/migration/seed dùng chung đặt trong `database/` (không nhân bản trong module API);
`database/local/` chỉ chứa script hạ tầng. `.env.example` là định hướng biến môi trường cho app tương lai,
chưa có code đọc nó.

## Nguồn sự thật và quyết định còn mở

- Phạm vi/nghiệp vụ/rubric: [docs/requirements.md](docs/requirements.md); phân công A–E: [docs/ownership.md](docs/ownership.md);
  mốc: [docs/plan.md](docs/plan.md); trạng thái quyết định: [agent/decisions.md](agent/decisions.md).
- Chưa chốt: schema chi tiết, trạng thái chứng từ, hợp đồng API, trạng thái được hủy và doanh thu sau hủy,
  cơ chế cập nhật kho/khóa/chống hoàn kho lặp, UI library, ORM/cách truy cập DB, phiên bản runtime app.
  Không tự chọn thay nhóm; nếu task buộc phải quyết, ghi đề xuất vào `agent/decisions.md`.
- Khi cập nhật bằng chứng (ví dụ KIEM-TRA.md), ghi rõ ai chạy, trên máy nào, nguồn xác nhận; chỉ ghi kết quả thật.
- Bàn giao theo [agent/handoff-template.md](agent/handoff-template.md); quy trình nhánh/PR ở [CONTRIBUTING.md](CONTRIBUTING.md).
