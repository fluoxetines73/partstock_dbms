# Indexing

Owner B (Tuấn). Lượt đầu ngày 13/11/2026 kiểm tra query plan trước và sau khi thêm
index trên cả hai lab. Lượt ngày 14/11 bổ sung warm-up và đo lặp.

## Chạy lại

Từ gốc repo, bật `mysql-lab` và `mongo-lab` và khởi tạo `rs0` theo
[setup-local-docker.md](../../setup-local-docker.md). Chạy bằng Node đã có trên máy.

```powershell
node experiments/indexing/run.cjs
node experiments/indexing/run.cjs --index-size
node experiments/indexing/run.cjs --update-cost
```

Script sinh dữ liệu một lần rồi nạp vào MySQL lab và một collection mới trong MongoDB
lab. Lệnh đo query dùng bảng tạm MySQL. Chế độ `--index-size` và `--update-cost` dùng
bảng InnoDB thường trong schema riêng do tài khoản root của `mysql-lab` tạo. MySQL cũng
dùng tài khoản đó để đọc index stats ở chế độ `--index-size`. Script dọn schema và
collection do lượt chạy tạo. Kết quả JSON in ra stdout.
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

Lượt đầu chạy một mẫu mỗi điều kiện theo thứ tự nạp → đo trước index → tạo index → đo lại.
Cache không được xóa hay làm nóng theo quy trình riêng.

## Đo lặp ngày 14/11/2026

Mỗi query ở mỗi pha trước/sau index chạy **1 warm-up và 5 mẫu đo** trên cùng 10.000
sản phẩm. Warm-up nằm ngoài thống kê. Cache được giữ nguyên trong lượt chạy. Script
lưu từng query plan, số bản ghi trả về và median của 5 mẫu. Cả 5 mẫu ở mọi pha trả
đúng 1 kết quả cho SKU và 11 cho hãng + giá.

| Hệ | Query | Median trước (ms) | Median sau (ms) |
|---|---|---:|---:|
| MySQL 8.4.13 | SKU | 1,68 | 0,00527 |
| MySQL 8.4.13 | Hãng + giá | 1,26 | 0,0118 |
| MongoDB 8.0.34 | SKU | 2 | 0 |
| MongoDB 8.0.34 | Hãng + giá | 2 | 0 |

MySQL lấy thời điểm hoàn tất ở root iterator trong `EXPLAIN ANALYZE`. MongoDB lấy
`executionTimeMillis` trong `executionStats`, có độ phân giải mili giây. Giá trị
`0 ms` là số công cụ báo cho lượt chạy rất ngắn. Dùng thời gian để đối chiếu
trước/sau trong từng hệ. [results-repeated.json](results-repeated.json)

## Index size ngày 14/11/2026

Đo một lượt trên cùng 10.000 sản phẩm, trước và sau khi tạo `idx_sku` và
`idx_brand_price`, trước mọi workload update. MySQL 8.4.13 chạy `ANALYZE TABLE`
rồi đọc `mysql.innodb_index_stats`, lấy số page nhân với 16.384 bytes/page. MongoDB
8.0.34 trên `rs0` đọc `collection.stats({ scale: 1 }).indexSizes` theo bytes.

| Hệ | Index | Trước (bytes) | Sau (bytes) |
|---|---|---:|---:|
| MySQL | `PRIMARY` | 1.589.248 (97 pages) | 1.589.248 (97 pages) |
| MySQL | `idx_sku` | — | 245.760 (15 pages) |
| MySQL | `idx_brand_price` | — | 229.376 (14 pages) |
| MongoDB | `_id_` | 4.096 | 4.096 |
| MongoDB | `idx_sku` | — | 135.168 |
| MongoDB | `idx_brand_price` | — | 106.496 |

Hai secondary indexes chiếm thêm 475.136 bytes trên MySQL và 241.664 bytes trên
MongoDB trong lượt đo này. `PRIMARY` của InnoDB là clustered index, chứa cả dữ liệu
dòng. MongoDB báo dung lượng index theo storage engine tại thời điểm lấy stats,
ngay sau nạp hoặc tạo index. Dùng bảng để đọc phần dung lượng tăng thêm trong
từng hệ. [results-index-size.json](results-index-size.json)

## Update cost ngày 14/11/2026

Trên cùng dataset 10.000 sản phẩm, mỗi batch tăng `selling_price` thêm 1.000 VND cho
ID 1 đến 1.000, truy cập qua `PRIMARY` trên MySQL và `_id_` trên MongoDB. Pha trước
chỉ có index mặc định. Pha sau có thêm `idx_sku` và `idx_brand_price`. Mỗi pha có
1 warm-up và 5 mẫu tính median. Không flush cache.

| Hệ | Median trước (ms) | Median sau (ms) | Chênh lệch |
|---|---:|---:|---:|
| MySQL 8.4.13 | 8,389 | 11,849 | +41,2% |
| MongoDB 8.0.34 | 21,755 | 24,897 | +14,4% |

MySQL dùng khoảng thời gian giữa hai mốc `SYSDATE(6)` trong cùng session, bao quanh
câu `UPDATE` với `autocommit = 1`. MongoDB dùng timer của `mongosh` quanh một lệnh
`updateMany` với `writeConcern: { w: 'majority' }` trên `rs0` một node. Timer MongoDB
bao gồm gửi lệnh và chờ phản hồi. So median trước/sau trong từng hệ.

Sau từng batch, script giảm giá 1.000 VND ngoài timer và đối chiếu từng giá về baseline.
Tất cả lượt tăng và hoàn giá sửa đúng 1.000 bản ghi. Hai query cuối vẫn trả đúng tập kết
quả 1 SKU và 11 sản phẩm theo hãng + giá. Workload thay đổi cột thuộc `idx_brand_price`,
còn khóa của `idx_sku` giữ nguyên. Mức tăng trên là kết quả của một lượt thí nghiệm
với 5 mẫu mỗi pha. [results-update-cost.json](results-update-cost.json)
