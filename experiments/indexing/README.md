# Indexing

Owner B (Tuấn). Lượt đầu ngày 13/11/2026 kiểm tra kế hoạch thực thi trước và sau khi thêm
index trên cả hai lab.

## Chạy lại

Từ gốc repo, bật `mysql-lab` và `mongo-lab` và khởi tạo `rs0` theo
[setup-local-docker.md](../../setup-local-docker.md). Chạy bằng Node đã có trên máy.

```powershell
node experiments/indexing/run.cjs
```

Script sinh dữ liệu một lần rồi nạp vào bảng tạm MySQL và một collection mới trong
MongoDB lab. Mỗi lần chạy dùng cấu trúc riêng. Bảng tạm mất khi đóng kết nối. Script
dọn đúng collection vừa tạo sau phép thử. Kết quả JSON in ra stdout.
[run.cjs](run.cjs) · [mysql.sql](mysql.sql) · [mongodb.js](mongodb.js)

## Dữ liệu và truy vấn

Cùng 10.000 linh kiện sinh theo công thức cố định, chia đều cho 20 hãng. Mỗi hãng có
500 mức giá, từ 100.000 VND, bước 2.000 VND. Hai hệ cùng trả `sku`, `name`, `brand_id`
và `selling_price`. MySQL lưu giá `DECIMAL(15,0)`, MongoDB dùng số nguyên trong phạm vi
dữ liệu thử. Cả hai lưu mã hãng trực tiếp để đo truy vấn theo hãng.

| Truy vấn | Index thêm | Số bản ghi khớp |
|---|---|---:|
| SKU bằng `IDX-0004201` | `idx_sku (sku)` | 1 |
| Hãng `7`, giá từ 500.000 đến 520.000 VND | `idx_brand_price (brand_id, selling_price)` | 11 |

Mốc trước chỉ có khóa chính `id` trên MySQL và index `_id` trên MongoDB. Bảng lab riêng
cho phép đo truy vấn SKU trước khi thêm index, vì `products.sku` của app đã có `UNIQUE`.

## Kết quả ngày 13/11/2026

MySQL 8.4.13 dùng InnoDB với buffer pool 128 MiB. MongoDB 8.0.34 dùng replica set
`rs0` một node. Docker Desktop chạy Linux x86_64 với 16 CPU logic và khoảng 7,41 GiB RAM
khả dụng cho engine, hai container lab dùng tài nguyên chung của engine.

| Hệ và truy vấn | Trước index | Sau index |
|---|---|---|
| MySQL, SKU | `Table scan` đọc 10.000 dòng, lọc còn 1 | `Index lookup` qua `idx_sku`, trả 1 dòng |
| MySQL, hãng + giá | `Table scan` đọc 10.000 dòng, lọc còn 11 | `Index range scan` qua `idx_brand_price`, trả 11 dòng |
| MongoDB, SKU | `COLLSCAN`, kiểm tra 10.000 document | `IXSCAN` + `FETCH`, kiểm tra 1 key và 1 document |
| MongoDB, hãng + giá | `COLLSCAN`, kiểm tra 10.000 document | `IXSCAN` + `FETCH`, kiểm tra 11 key và 11 document |

Hai hệ trả cùng SKU, tên, hãng và giá. Index ghép tìm theo hãng trước rồi đọc khoảng giá
trong hãng đó. MongoDB đọc thêm document để lấy các trường nằm ngoài index.
[results-initial.json](results-initial.json)

Mỗi điều kiện chạy một lần theo thứ tự nạp → đo trước index → tạo index → đo lại.
Cache không được xóa hay làm nóng theo quy trình riêng. Số thời gian trong JSON là
số đo của kế hoạch thực thi trong lượt đó. Lượt sau cần đo lặp, ghi điều kiện cache
và cách tổng hợp, đo thêm kích thước index và chi phí cập nhật.
