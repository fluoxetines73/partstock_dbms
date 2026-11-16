# Khung backend — đề xuất tối giản

A chuẩn bị ngày 11/11/2026 trên nhánh `docs/a-sprint1-foundation`.
Theo [plan](../plan.md). Người dùng đã tự cài thư viện; khung backend đã được viết trên nhánh này.

Đề xuất Express 5 + TypeScript, kết nối MySQL bằng mysql2/promise và viết SQL trực tiếp.
Cách này giữ câu truy vấn dễ đọc cho môn DBMS và không thêm ORM vào cơ chế transaction D/E.
Máy hiện có Node v26.13.0 và npm 12.2.2; phiên bản dùng chung của nhóm cần được xác nhận.
Ghim phiên bản thư viện bằng package-lock khi cài thực tế.

Cấu trúc khởi đầu:

```text
backend/
  src/
    app.ts       # Express và route
    server.ts    # khởi chạy, đóng server/pool khi dừng
    config.ts    # đọc/kiểm tra biến môi trường
    db.ts        # pool MySQL app
  tests/         # kiểm tra cấu hình và API health
  README.md      # lệnh cài/chạy/kiểm tra đã xác minh
```

Dùng lại biến APP_MYSQL_HOST, APP_MYSQL_PORT, APP_MYSQL_DATABASE, APP_MYSQL_USER, APP_MYSQL_PASSWORD
và PORT. Điền từ kết nối MySQL app hiện có; không dùng tài khoản lab hoặc root.
Không in mật khẩu/chuỗi kết nối vào log. Thiếu cấu hình thì báo tên biến thiếu và dừng.

GET /health trả 200 khi HTTP server đang chạy. GET /ready chạy SELECT 1 bằng pool,
trả 200 khi DB sẵn sàng, 503 khi không kết nối được; không trả lỗi SQL ra client.
Đây là kiểm tra kết nối, không tuyên bố schema nghiệp vụ đã sẵn sàng.

Dùng TypeScript biên dịch bằng tsc, Node chạy mã đã biên dịch; test dùng node:test.
Dependencies dự kiến: express, mysql2; devDependencies: typescript, @types/node,
@types/express. Chưa cần thư viện cấu hình, ORM hoặc bộ test khác trong bước này.

Thứ tự thực hiện sau khi xác nhận công cụ/cài dependency:

1. Tạo package và cấu hình TypeScript, cài dependencies, lưu lockfile.
2. Viết kiểm tra cấu hình và /health, /ready với DB giả lập lỗi/thành công.
3. Viết config, app, pool và khởi chạy; chạy build/test.
4. Thử SELECT 1 trên MySQL app, không ghi/xóa dữ liệu; ghi kết quả thật vào README.
5. B review khung A; sau đó thêm module UC01 theo schema/API đã chốt.

Thực tế: build và 6 test đạt. SELECT 1 thật chưa đạt (ECONNREFUSED), không có container
đang chạy tại lần kiểm tra. Cấu hình đọc trực tiếp .env.docker ở gốc, không tạo bản secret thứ hai.

Nguồn công cụ: [Express 5](https://expressjs.com/guide/migrating-5/),
[mysql2 TypeScript](https://sidorares.github.io/node-mysql2/docs/documentation/typescript-examples).
Đây là đề xuất của trợ lý, chưa là lựa chọn chung được nhóm xác nhận.
