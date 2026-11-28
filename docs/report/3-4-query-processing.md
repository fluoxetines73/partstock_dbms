# 3.4. Query processing · C

Lượt chạy 16/11/2026 dùng Docker Desktop Linux, 8 vCPU và khoảng 3,68 GiB RAM
cho engine, InnoDB buffer pool 128 MiB. MongoDB chạy rs0 một node. Cùng fixture
2.400 sản phẩm và 4.800 đơn, một dòng mỗi đơn. Một lượt làm nóng và ba lượt đo
cho mỗi kế hoạch, không xóa cache. Kết quả của hai hệ khớp baseline độc lập.
[Script và hướng dẫn](../../experiments/query-processing/README.md) ·
[Kết quả](../../experiments/query-processing/results-local.json).

| Truy vấn | Kết quả chung | MySQL 8.4.13 | MongoDB 8.0.34 |
|---|---:|---|---|
| Lọc danh mục, hãng, khoảng giá và tồn | 26 sản phẩm | Quét khoảng trên `qp_filter` đưa 40 dòng vào bước lọc tồn. | IXSCAN + FETCH xét 40 key và 40 document. |
| Cùng bộ lọc, bỏ qua index lọc | 26 sản phẩm | `IGNORE INDEX` đọc 2.400 dòng qua PK trước khi lọc. | Hint `$natural` đọc 2.400 document. |
| Chưa từng bán | 600 sản phẩm | `NOT EXISTS` thành antijoin. Engine materialize 1.800 ID đã bán và dò theo 2.400 sản phẩm. | `$lookup` dùng index `line.product_id_1`; cursor đọc 2.400 sản phẩm và lookup xét 1.964 document đơn. |
| Doanh thu từ 01/11 đến trước 16/11 | 599.942.000 VND | Range scan theo trạng thái/ngày đưa 1.874 đơn vào join theo PK dòng, rồi aggregate. | Duyệt 1.874 key và document qua index trạng thái/ngày rồi GROUP trên dòng nhúng. |

Với lọc kết hợp, chỉ mục giảm đầu vào lọc tồn từ 2.400 xuống 40 ở cả hai hệ.
Truy vấn chưa từng bán cho thấy hai cách kiểm tra sự tồn tại của giao dịch:
MySQL chuẩn bị tập ID trước khi dò, MongoDB tra đơn từ từng sản phẩm. Trong
truy vấn doanh thu, cả hai lọc đầu đơn theo cùng điều kiện. MySQL đọc dòng qua
join còn MongoDB lấy trường từ đơn đã đọc. Kết luận này phụ thuộc mô hình một
dòng mỗi đơn và các chỉ mục của fixture.

Median của thời điểm kết thúc operator gốc MySQL lần lượt là 0,0925 ms, 0,855 ms,
7,46 ms và 4,37 ms theo thứ tự lọc có index, lọc quét, chưa từng bán và doanh thu.
Kết quả ghi cả ba mẫu. MySQL báo thời gian/rows theo iterator và loops.
MongoDB báo execution statistics với độ phân giải mili giây, gồm số liệu cursor
và ước tính từng stage trong pipeline. Hai loại thời gian khác phạm vi nên phần
phân tích dựa trên operator và lượng dữ liệu đã xử lý.
[MySQL 8.4 EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html) ·
[MongoDB 8.0 Explain Results](https://www.mongodb.com/docs/v8.0/reference/explain-results/).

Lượt kiểm tra 28/11 trên MySQL 8.4.13 và MongoDB 8.0.34 rs0 khớp baseline và
SHA-256 của bốn biến thể trong kết quả lưu. Các số đo thời gian ở trên thuộc
lượt 16/11. Kịch bản trình bày và cách kiểm tra ứng dụng đi kèm nằm trong
[bàn giao C](../handoffs/c-sprint1-2.md#demo-phần-c).

## Kết luận cho PartStock

MySQL phù hợp với phần báo cáo của PartStock vì dữ liệu ứng dụng đã lưu đầu
đơn và dòng bán riêng. Truy vấn doanh thu lọc đơn theo trạng thái và ngày xác
nhận trước, rồi dùng khóa để đọc dòng bán và cộng theo giá chốt trên chứng từ.
Trong mô hình MongoDB của lab, doanh thu dùng dòng bán đã nhúng nên bỏ được
bước nối này. Khi tìm linh kiện chưa từng bán từ danh sách sản phẩm, MongoDB
vẫn cần tra đơn bằng `$lookup`. Với bộ lọc danh mục, hãng, giá và tồn, cả hai
hệ xét 40 thay vì 2.400 bản ghi khi dùng chỉ mục đã thử. Mỗi đơn trong lab có
một dòng và các lượt đo dùng cache đã làm nóng. Kết luận áp dụng cho mô hình
và các truy vấn đã thử của PartStock.
