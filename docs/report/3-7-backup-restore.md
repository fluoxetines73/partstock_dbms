# 3.7. Backup/restore trên MySQL và MongoDB

## 3.7.1. Phương pháp

Thí nghiệm kiểm tra khả năng khôi phục một logical backup vào đích lab sạch.
Mỗi hệ dùng cùng fixture gồm hai sản phẩm `RAM-KIN-08` và `SSD-KIN-500`, một đơn bán
đã xác nhận với hai dòng và hai bản ghi tồn. MySQL lưu dòng đơn trong bảng
`sales_order_lines`. MongoDB nhúng hai dòng vào document `sales_orders`.
Chứng từ và tồn là fixture của bài lab. [experiments/backup-restore/README.md](../../experiments/backup-restore/README.md)

Trước khi backup, script đối chiếu snapshot nguồn với số liệu kỳ vọng. Dữ liệu nguồn
giữ nguyên trong khi dump. Mỗi lượt tạo tên riêng cho nguồn và đích, giữ lại nguồn
để đối chiếu và ghi elapsed time của lệnh backup, restore cùng số byte của file dump.

- **MySQL 8.4.13:** dùng `mysqldump --single-transaction` cho các bảng InnoDB,
  rồi import SQL vào schema lab mới bằng MySQL client. [MySQL mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- **MongoDB 8.0.34:** dùng `mongodump --archive` trên `rs0 PRIMARY` một node.
  `mongorestore --nsFrom/--nsTo` ánh xạ các collection sang database lab mới. Lượt xác minh
  script dùng MongoDB Database Tools 100.20.0. [MongoDB mongodump](https://www.mongodb.com/docs/database-tools/mongodump/) · [MongoDB mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/)

## 3.7.2. Kết quả

Bảng ghi một lượt chạy thủ công trên mỗi hệ ngày 14/11/2026.

| Hệ | Backup (s) | Restore (s) | Dump (bytes) | Đối chiếu |
|---|---:|---:|---:|---|
| MySQL | 0,078 | 0,115 | 4.491 | PASS |
| MongoDB | 1,142 | 0,117 | 1.781 | PASS |

| Chỉ số | MySQL trước/sau | MongoDB trước/sau |
|---|---:|---:|
| Sản phẩm | 2 / 2 | 2 / 2 |
| Đơn đã xác nhận | 1 / 1 | 1 / 1 |
| Dòng đơn | 2 / 2 | 2 / 2 |
| Bản ghi tồn | 2 / 2 | 2 / 2 |
| Tổng tồn (đơn vị) | 11 / 11 | 11 / 11 |
| Tổng tiền đơn đã xác nhận (VND) | 1.830.000 / 1.830.000 | 1.830.000 / 1.830.000 |

MongoDB báo phục hồi thành công 5 documents với 0 lỗi. Hai dòng đơn được tính từ
mảng trong document đơn bán. Lượt chạy lại bằng hai script cũng đạt các giá trị đối
chiếu trên. Log gốc của lượt thủ công được lưu local trong
`experiments/backup-restore/artifacts/2026-11-14/`. Kết quả hiện là kiểm chứng của Tuấn.
Hải sẽ chạy restore độc lập trên lab của mình. [experiments/backup-restore/README.md](../../experiments/backup-restore/README.md) · [Bàn giao cho Hải](https://github.com/fluoxetines73/partstock_dbms/pull/3#issuecomment-6872371662)

## 3.7.3. Kết luận và giới hạn

Hai logical backups phục hồi đủ các bản ghi và các tổng nghiệp vụ đã chọn cho fixture.
SQL dump của MySQL chứa schema và các lệnh insert. MongoDB dùng binary archive và mô hình
document nhúng. Thời gian và kích thước trong bảng mô tả lượt chạy với fixture nhỏ và
hai định dạng backup đó. Điểm xác minh chính là dữ liệu đích khớp snapshot nguồn.
Phạm vi bài lab là backup/restore khi nguồn đứng yên, còn crash recovery, failover và
point-in-time recovery là các cơ chế riêng.

Lệnh chạy lại và output cần quan sát nằm trong [demo-mien-b.md](demo-mien-b.md).
