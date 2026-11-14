# 3.3. Indexing trên MySQL và MongoDB

## 3.3.1. Thiết kế thí nghiệm

Thí nghiệm đo tác động của index với hai truy vấn PartStock. Truy vấn thứ nhất tìm chính xác
SKU `IDX-0004201` và trả một sản phẩm. Truy vấn thứ hai lọc `brand_id = 7` và
`selling_price` từ 500.000 đến 520.000 VND, gồm hai đầu mút, và trả 11 sản phẩm.
Cả hai hệ trả cùng bốn trường `sku`, `name`, `brand_id`, `selling_price`.

Dataset gồm 10.000 sản phẩm sinh theo công thức cố định, chia đều cho 20 hãng.
Mỗi hãng có 500 mức giá, bắt đầu từ 100.000 VND và tăng mỗi bước 2.000 VND.
MySQL lưu giá bằng `DECIMAL(15,0)`. MongoDB lưu giá bằng số nguyên trong phạm vi dữ liệu thử.
Hai model lưu trực tiếp `brand_id` để phép lọc theo hãng dùng cùng điều kiện.

Thí nghiệm chạy trên MySQL 8.4.13 với InnoDB và buffer pool 128 MiB, cùng MongoDB 8.0.34
trên replica set `rs0` một node. Docker Desktop dùng Linux x86_64 với 16 CPU logic và khoảng
7,41 GiB RAM khả dụng cho engine. Hai service lab chia sẻ tài nguyên Docker.

Baseline chỉ có primary index `PRIMARY` trên MySQL và `_id_` trên MongoDB. Pha sau bổ sung
index đơn `idx_sku (sku)` và index ghép `idx_brand_price (brand_id, selling_price)`.
MySQL dùng bảng lab riêng để baseline có thể thử SKU trước khi có index. Bảng `products`
của ứng dụng đã có `UNIQUE(sku)`. [experiments/indexing/README.md](../../experiments/indexing/README.md)

## 3.3.2. Query plan và thời gian đọc

Với từng query và từng pha, chạy 1 warm-up rồi lấy median của 5 mẫu. Thí nghiệm không
flush cache. MySQL dùng thời gian hoàn tất ở root iterator của `EXPLAIN ANALYZE`.
MongoDB dùng `executionTimeMillis` từ `executionStats`. Hai timer có phạm vi và độ phân giải
khác nhau, nên median chỉ dùng để đối chiếu trước/sau trong từng hệ. MongoDB báo `0 ms`
khi thời gian đo được nằm ở mức 0 theo độ phân giải mili giây của công cụ.
[MySQL EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html) · [MongoDB explain results](https://www.mongodb.com/docs/v8.0/reference/explain-results/)

| Hệ | Query | Plan trước → sau | Số đọc trước → sau | Kết quả | Median trước → sau (ms) |
|---|---|---|---|---:|---:|
| MySQL | SKU | `Table scan` → `Index lookup` qua `idx_sku` | 10.000 rows tại scan → 1 row tại lookup | 1 | 1,68 → 0,00527 |
| MySQL | Hãng + giá | `Table scan` → `Index range scan` qua `idx_brand_price` | 10.000 rows tại scan → 11 rows tại range scan | 11 | 1,26 → 0,0118 |
| MongoDB | SKU | `COLLSCAN` → `IXSCAN` + `FETCH` | 10.000 → 1 document, 0 → 1 key | 1 | 2 → 0 |
| MongoDB | Hãng + giá | `COLLSCAN` → `IXSCAN` + `FETCH` | 10.000 → 11 documents, 0 → 11 keys | 11 | 2 → 0 |

Index đơn theo `sku` cho phép tra trực tiếp giá trị cần tìm. Index ghép xếp key theo
`brand_id` trước, rồi theo `selling_price` trong từng hãng. Sau khi định vị hãng 7,
engine chỉ cần quét khoảng giá yêu cầu trong hãng đó. MongoDB vẫn dùng `FETCH` để lấy
các trường trong projection nằm ngoài index. Cả 40 mẫu đo trả đúng số kết quả.
[results-repeated.json](../../experiments/indexing/results-repeated.json)

## 3.3.3. Index size

Đo một lượt sau khi nạp dataset, trước mọi workload update. MySQL dùng bảng InnoDB thường
trong schema lab riêng, chạy `ANALYZE TABLE` rồi đọc `mysql.innodb_index_stats`.
Dung lượng được tính từ số page nhân với 16.384 bytes/page. MongoDB lấy `indexSizes`
theo byte bằng `collection.stats({ scale: 1 })` tại thời điểm thu stats.
[MySQL InnoDB index stats](https://dev.mysql.com/doc/refman/8.4/en/innodb-persistent-stats.html) · [MongoDB collection stats](https://www.mongodb.com/docs/v8.0/reference/method/db.collection.stats/)

| Hệ | Index | Trước (bytes) | Sau (bytes) |
|---|---|---:|---:|
| MySQL | `PRIMARY` | 1.589.248 | 1.589.248 |
| MySQL | `idx_sku` | — | 245.760 |
| MySQL | `idx_brand_price` | — | 229.376 |
| MongoDB | `_id_` | 4.096 | 4.096 |
| MongoDB | `idx_sku` | — | 135.168 |
| MongoDB | `idx_brand_price` | — | 106.496 |

Hai secondary indexes làm tăng dung lượng index được ghi nhận thêm **475.136 bytes trên MySQL**
và **241.664 bytes trên MongoDB**. InnoDB lưu dữ liệu dòng trong clustered index `PRIMARY`.
MongoDB báo dung lượng index tách khỏi dữ liệu collection. Vì vậy, đọc phần tăng thêm trong
từng hệ và ghi rõ thời điểm lấy số liệu. [results-index-size.json](../../experiments/indexing/results-index-size.json)

## 3.3.4. Update cost

Mỗi batch tăng `selling_price` thêm 1.000 VND cho 1.000 sản phẩm có ID từ 1 đến 1.000.
Hai pha khóa đường truy cập theo `PRIMARY` trên MySQL và `_id_` trên MongoDB, để phần
khác biệt giữa hai pha tập trung vào việc duy trì secondary index. Mỗi pha chạy 1 warm-up
và 5 mẫu. Sau mỗi batch, script hoàn giá ngoài timer và kiểm tra cả 1.000 giá khớp baseline.

| Hệ | Mẫu đo mỗi pha | Bản ghi cập nhật/batch | Median trước (ms) | Median sau (ms) | Chênh lệch |
|---|---:|---:|---:|---:|---:|
| MySQL | 5 | 1.000 | 8,389 | 11,849 | +41,2% |
| MongoDB | 5 | 1.000 | 21,755 | 24,897 | +14,4% |

Timer MySQL bao quanh câu `UPDATE` trong cùng session với `autocommit = 1`. Timer MongoDB
đo từ `mongosh` quanh một lệnh `updateMany` với `writeConcern: { w: 'majority' }`, bao gồm
gửi lệnh và chờ phản hồi. So sánh timing trong từng hệ. Workload thay đổi `selling_price`,
nên ảnh hưởng trực tiếp đến key của `idx_brand_price`. Key của `idx_sku` giữ nguyên.
Cả 24 batch, tính cả warm-up, đều đạt số lượng cập nhật và kiểm tra baseline.
[results-update-cost.json](../../experiments/indexing/results-update-cost.json)

## 3.3.5. Kết luận và tái tạo

Trong dataset và hai query đã thử, thêm index giảm lượng dữ liệu phải đọc và giữ nguyên
kết quả truy vấn. Secondary indexes tăng dung lượng lưu trữ và median của batch cập nhật
giá trong từng hệ. Kết quả áp dụng cho phân bố dữ liệu, workload và điều kiện lab mô tả ở trên.
Pha có index chạy sau baseline và cache được giữ lại. Các số đo phản ánh một lần thiết lập
cho mỗi chế độ với năm mẫu thời gian mỗi pha, nên phạm vi kết luận giới hạn ở thí nghiệm này.

Từ gốc repo, bật `mysql-lab`, `mongo-lab` và xác nhận `rs0 PRIMARY`, rồi chạy:

```powershell
node experiments/indexing/run.cjs
node experiments/indexing/run.cjs --index-size
node experiments/indexing/run.cjs --update-cost
```

Khi demo, xem lần lượt query plan và số kết quả 1/11, index size của hai secondary indexes,
rồi trường `modified`, `reset` và `baselineMatches` của workload update.
[run.cjs](../../experiments/indexing/run.cjs) · [experiments/indexing/README.md](../../experiments/indexing/README.md)
