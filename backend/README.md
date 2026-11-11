# Backend PartStock

Express 5 + TypeScript + mysql2, SQL trực tiếp. Node trên máy đã kiểm tra: v26.13.0.
Phiên bản thư viện được lưu trong package-lock.json; nhóm vẫn cần review lựa chọn chung.

## Chạy local

Từ gốc repo, bảo đảm đã tạo `.env.docker` theo [hướng dẫn Docker](../setup-local-docker.md),
rồi khởi động MySQL app:

```bash
docker compose --env-file .env.docker -f compose.local.yaml up -d mysql-app
cd backend
npm ci
npm run build
npm start
```

Nếu đã cài thư viện thì bỏ qua npm ci. Backend dùng lại APP_MYSQL_HOST, APP_MYSQL_PORT,
APP_MYSQL_DATABASE, APP_MYSQL_USER và APP_MYSQL_PASSWORD trong `.env.docker` tại gốc repo.
Không sao chép mật khẩu vào code. Dùng tài khoản app, không dùng root/lab.
PORT mặc định 3000, có thể đặt qua biến môi trường. Server chỉ lắng nghe 127.0.0.1.

- http://127.0.0.1:3000/health: HTTP server chạy, trả 200.
- http://127.0.0.1:3000/ready: thử SELECT 1, trả 200 nếu kết nối được DB hoặc 503 nếu lỗi.

`/ready` chỉ kiểm tra kết nối, chưa kiểm tra schema. DB tắt vẫn có thể chạy HTTP server;
`/health` không thay kiểm tra `/ready`. Ctrl+C để dừng và đóng pool kết nối.

## Kiểm tra

```bash
npm test
```

Test tự mở cổng localhost ngẫu nhiên, không cần Docker và không ghi DB; dùng hàm kiểm tra
DB giả lập để kiểm tra phản hồi thành công/lỗi. Sandbox chặn mở cổng thì cần quyền chạy test
ngoài sandbox. Build riêng: `npm run build`.

Kết quả thực tế 11/11/2026:

- Build TypeScript đạt; 6/6 test đạt ngoài sandbox.
- Lần đầu SELECT 1 báo ECONNREFUSED khi container chưa chạy. Sau khi người dùng khởi động
  container, kết nối app thành công và đã áp dụng migration UC01 (chi tiết bên dưới).

Đã bổ sung API/schema UC01 bên dưới; chưa có phân quyền người dùng hoàn chỉnh. Schema/migration đặt trong
[database/](../database/README.md), không nhân bản trong module API. D–E thống nhất cơ chế
chứng từ/tồn/biến động trước khi triển khai các giao dịch đó. MongoDB chỉ dùng cho lab.

## UC01 — API danh mục và thương hiệu

Đã có hai bảng `categories`, `brands` trên MySQL app ở lần triển khai 11/11; chưa nạp seed.
Trên máy mới, sau khi build, chạy `npm run db:setup` một lần để tạo hai bảng.
Lệnh dừng nếu bảng đã tồn tại; không tự bỏ qua schema khác hoặc xóa bảng để tạo lại.
MySQL DDL không rollback cả file: nếu lỗi giữa chừng, kiểm tra schema trước khi sửa/chạy lại.
B cần hợp nhất file `database/mysql/migrations/001_catalogs.sql` vào migration chung.

Quyền quản lý local tạm thời dùng `APP_MANAGER_TOKEN`. Tạo token bằng:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Thêm `APP_MANAGER_TOKEN=<token vừa tạo>` vào `.env.docker` của riêng bạn, rồi chạy lại
`npm start`. Không commit hoặc chia sẻ token. Khi gọi API, gửi header
`Authorization: Bearer <token>`. Không cấu hình trả 503; thiếu token trả 401; token sai trả 403.
Đây chưa là hệ thống đăng nhập hoặc phân quyền hai actor hoàn chỉnh.

| Thao tác | Danh mục | Thương hiệu |
|---|---|---|
| Xem | GET /api/categories | GET /api/brands |
| Thêm | POST /api/categories | POST /api/brands |
| Sửa | PATCH /api/categories/:id | PATCH /api/brands/:id |
| Xóa | DELETE /api/categories/:id | DELETE /api/brands/:id |

Body thêm/sửa: `{"name":"RAM"}`. Tên được trim, chuẩn hóa Unicode NFC, dài 1–100 ký tự;
không phân biệt hoa/thường nhưng phân biệt dấu. POST trả 201 với `{id,name}`; GET trả mảng;
PATCH trả item; DELETE trả 204. id luôn là chuỗi. Tên trùng trả 409 NAME_CONFLICT;
không tìm thấy khi sửa/xóa trả 404. Mục bị FK tham chiếu trả 409 RESOURCE_IN_USE.
B phải thêm FK RESTRICT từ products; chưa có bảng products trong migration này.

Kiểm tra bổ sung:

```bash
npm test
npm run test:db
```

11/11: 11/11 test API/cấu hình đạt. Test DB thật đạt trên schema tạm riêng của MySQL lab,
gồm migration/seed, CRUD hai bảng, tên trùng đồng thời, phân biệt dấu và FK bằng fixture.
Test DB dùng LAB_MYSQL_* và LAB_MYSQL_ROOT_PASSWORD, tạo/dọn schema test riêng;
không reset partstock/partstock_lab. Fixture sản phẩm không phải schema thật của B.
Chưa có giao diện, liên kết sản phẩm thật hoặc review B; UC01 chưa Done.
