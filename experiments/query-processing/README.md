# Query processing · C

So sánh kế hoạch lọc kết hợp, tìm sản phẩm chưa từng bán và tổng hợp doanh thu.
Bộ sinh trong `run.cjs` tạo cùng 2.400 sản phẩm, 4.800 đơn, một dòng mỗi đơn.
MySQL tách đơn và dòng. MongoDB nhúng dòng vào đơn và dùng `$lookup` để truy
ngược lịch sử từ sản phẩm. Dữ liệu lab do script sinh riêng, độc lập với app.

## Chạy lại

Chuẩn bị `.env.docker` và rs0 theo [hướng dẫn Docker](../../setup-local-docker.md).
Chạy từ gốc repo:

```powershell
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait mysql-lab mongo-lab
node experiments/query-processing/run.cjs
```

Script gọi đúng hai service lab qua Compose, kiểm tra credential lab ở trong
container và MySQL dùng bảng tạm theo kết nối. MongoDB chỉ dọn collection có
tiền tố ngẫu nhiên do lượt chạy đó tạo. Nếu tiến trình bị ngắt đột ngột, chỉ
dọn các collection của lượt đã dừng sau khi đối chiếu tên và DB lab.

Mỗi truy vấn chạy một lượt lấy kết quả, một lượt explain làm nóng, rồi ba lượt
explain được ghi. Không xóa cache. Đối chiếu toàn bộ danh sách kết quả theo thứ
tự hoặc tổng tiền với baseline tính bằng JS, lưu SHA-256 để so lại. Thêm
`--raw` để lấy cây explain MongoDB đầy đủ. Kế hoạch MySQL được giữ nguyên
dạng TREE. Cách đọc và giới hạn có trong [báo cáo](../../docs/report/3-4-query-processing.md).

[Kết quả 16/11](results-local.json) ghi MySQL 8.4.13 và MongoDB 8.0.34 rs0 một node.
Các truy vấn và kết quả trên app xem [bàn giao C](../../docs/handoffs/c-sprint1-2.md).
