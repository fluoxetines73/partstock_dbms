# Backend

Chưa triển khai; chưa có lệnh chạy/test. Định hướng Node.js + Express + TypeScript, MySQL.
Chưa chọn phiên bản, thư viện DB/ORM hay hợp đồng API. Owner làm API use case tương ứng.
Đọc [yêu cầu](../docs/requirements.md), [kiến trúc](../docs/architecture/README.md),
[quyết định](../agent/decisions.md). Không thêm MongoDB làm backend ứng dụng thứ hai.
D–E cần thống nhất giao dịch cập nhật chứng từ/tồn/biến động, xử lý lỗi giữa chừng,
tranh chấp tồn cuối và chống hoàn kho lặp trước khi triển khai luồng nhập/bán/hủy/kiểm kê.
Schema/migration dùng chung đặt trong database/, không nhân bản trong module API.
