# 3.2. Storage & management — A

## Mục đích và model

Quan sát DBMS tổ chức dữ liệu và cấp phát lưu trữ khi tăng số bản ghi, mở rộng thông số
và xóa dữ liệu. Fixture sản phẩm linh kiện có cùng ID, SKU, tên, giá và mô tả ở hai hệ.
MySQL dùng bảng sản phẩm và bảng thông số 1:1 có FK; MongoDB nhúng thông số vào document.
Model lab này phục vụ quan sát, không chốt model nghiệp vụ thay B/D/E.

Lượt chạy ngày 15/11/2026: MySQL 8.4.13, InnoDB page 16 KiB, file-per-table;
MongoDB 8.0.34/WiredTiger, rs0 một node. Cấu hình buffer pool và creationString được ghi trong
[kết quả JSON](../../experiments/storage/results-initial.json). Chạy qua Docker Compose local,
không áp giới hạn tài nguyên bổ sung trong script. Không có phép đo hiệu năng/thời gian.

Có năm pha với cùng seed xác định. Mô tả 32 byte được lặp 16 lần thành 512 byte khi mở rộng.
Sau mỗi pha, script xác minh số bản ghi, giá trị ID/tên/SKU/giá/mô tả, tổng ID/giá và byte mô tả.
Kết quả cuối: 2.500 sản phẩm và 1.280.000 byte mô tả logic ở mỗi hệ, validation PASS.

## Kết quả quan sát

Đơn vị tất cả cột dung lượng là byte. MySQL cộng thống kê của cả hai bảng;
MongoDB lấy một collection. Một snapshot mỗi pha, không tính trung bình hoặc median.

| Pha | Sản phẩm | MySQL data_length | MySQL index_length | Mongo size | Mongo storageSize | Mongo freeStorageSize | Mongo index bytes |
|---|---:|---:|---:|---:|---:|---:|---:|
| empty | 0 | 32768 | 16384 | 0 | 4096 | 0 | 8192 |
| 1000 | 1000 | 180224 | 49152 | 141893 | 77824 | 0 | 110592 |
| 5000 | 5000 | 622592 | 131072 | 713893 | 380928 | 73728 | 532480 |
| expanded | 5000 | 5029888 | 131072 | 3113893 | 937984 | 303104 | 532480 |
| deleted_half | 2500 | 4882432 | 131072 | 1556945 | 1159168 | 630784 | 872448 |

MySQL dùng ANALYZE TABLE trước khi đọc metadata; estimatedRows vẫn là ước lượng,
còn COUNT(*) riêng xác minh số dòng thực. Với InnoDB, data_length phản ánh cấp phát cho
clustered index chứa dữ liệu; index_length phản ánh secondary indexes, không phải kích thước
chuỗi thuần. Xem [MySQL TABLES](https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html).

MongoDB dùng fsync trước collStats. size là kích thước document chưa nén; storageSize và
freeStorageSize mô tả lưu trữ được cấp phát/phần có thể tái sử dụng. fsync flush pending writes,
không yêu cầu fsyncLock. Xem [collStats](https://www.mongodb.com/docs/manual/reference/command/collstats/)
và [fsync](https://www.mongodb.com/docs/manual/reference/command/fsync/).

Sau xóa một nửa, Mongo size giảm từ 3.113.893 xuống 1.556.945 byte nhưng storageSize không
giảm tương ứng; MySQL data_length cũng vẫn cao so với pha trước khi mở rộng. Số bản ghi logic
và cấp phát lưu trữ là hai đại lượng khác nhau. Trong lượt này Mongo freeStorageSize tăng sau
xóa; không suy diễn rằng mọi lần xóa đều trả dung lượng ngay về hệ điều hành.

## Giới hạn và demo

Metadata hai hệ khác nghĩa và model khác cách tổ chức. Payload lặp có khả năng nén cao;
các số này không đại diện phân bố dữ liệu thực, không chứng minh hệ nào tiết kiệm hơn nói chung.
Không chạy compact/OPTIMIZE, không đo volume đầy đủ, journal, fragmentation toàn hệ hoặc tốc độ.
Kết quả có một lượt chính thức trên một máy; chưa được B review hoặc người khác tái tạo.

Từ gốc repo, bật hai dịch vụ lab rồi chạy `node experiments/storage/run.cjs`.
Khi demo: giải thích hai model → chỉ pha 1.000/5.000 → giải thích mở rộng mô tả →
so sánh số bản ghi sau xóa với cấp phát → chỉ validation PASS và cơ chế dọn đối tượng riêng.
Chi tiết quyền, seed và cách chạy: [README lab](../../experiments/storage/README.md).
