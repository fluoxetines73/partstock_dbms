# Storage & management — A

Bản đầu đã chạy 15/11/2026 trên MySQL 8.4.13/InnoDB và MongoDB 8.0.34/WiredTiger,
rs0 một node. [Kết quả](results-initial.json), [báo cáo/demo](../../docs/report/3-2-storage.md).
Lượt tái tạo ngày 23/11 trên môi trường Tuấn khớp dữ liệu logic ở cả năm pha.
Xem [kết quả và nhận xét review](../../docs/reviews/b-uc01-storage-2026-11-23.md).

## Chạy

Từ gốc repo có .env.docker, Docker và Node.js (không cài dependency mới):

```bash
docker compose --env-file .env.docker -f compose.local.yaml up -d mysql-lab mongo-lab
node experiments/storage/run.cjs
```

Đợi lab healthy và khởi tạo rs0 theo setup-local-docker.md nếu đây là lần đầu.
Lệnh trả JSON với validation PASS sau khi kiểm tra dữ liệu ở cả năm pha.
Muốn lưu lượt riêng: `node experiments/storage/run.cjs > /tmp/storage-result.json`.
Nếu thất bại, không dùng file output dở làm bằng chứng đạt.

## Dữ liệu và phương pháp

Fixture nằm trong [database/lab/storage](../../database/lab/storage/). Đây là model lab riêng,
không thay schema app: MySQL tách sản phẩm/thông số thành hai bảng liên kết 1:1;
MongoDB nhúng thông số trong sản phẩm. Cùng id, SKU, tên, giá và nội dung thông số.
Seed xác định: 5.000 id liên tiếp; mô tả là 32 ký tự đầu SHA256(id dạng thập phân).
Giá = 100000 + id * 10 VND. Không có dữ liệu người thật.

Các pha: rỗng → 1.000 sản phẩm → 5.000 → mô tả từ 32 lên 512 byte → xóa id chẵn.
Mỗi pha đối chiếu số lượng chính xác, tổng ID/giá/byte và từng giá trị fixture;
MySQL kiểm tra thêm đủ số dòng thông số. Có PK và unique SKU ngay từ đầu, không đổi index.

MySQL ANALYZE TABLE rồi đọc INFORMATION_SCHEMA.TABLES với stats_expiry=0,
ghi engine/row format/data_length/index_length/data_free và estimatedRows.
COUNT(*) riêng là số dòng chính xác, không dùng estimatedRows để kiểm chứng.
MongoDB gọi fsync không khóa ghi trước collStats, ghi size/storageSize/freeStorageSize,
indexSizes và cấu hình WiredTiger. Không chạy compact/OPTIMIZE/VACUUM, không đo tốc độ.
Có một lượt lấy số liệu chính thức, không flush cache cho benchmark.

## Phạm vi và dọn dữ liệu

Runner chỉ exec trong dịch vụ mysql-lab/mongo-lab, kiểm tra các biến môi trường lab.
Dùng credential admin riêng của lab để đọc metadata/fsync và tạo schema; không dùng secret app.
MySQL tạo schema `partstock_storage_<random>` rồi trap xóa chính schema đó khi xong.
MongoDB tạo collection `storage_<random>` trong partstock_lab rồi finally drop collection đó.
Không reset DB lab chung hoặc MySQL app. Nếu tiến trình/container bị kill cứng, kiểm tra và
chỉ dọn đúng đối tượng của lượt lỗi; không dùng dropDatabase trên partstock_lab.
fsync ảnh hưởng pending writes của toàn MongoDB lab: nên chạy khi các lab khác đang dừng.

Hai chỉ số data_length và collStats.size/storageSize có nghĩa khác nhau; không cộng lẫn
hoặc dùng làm bảng xếp hạng hai DBMS. Mô tả lặp và nén ảnh hưởng mạnh đến số byte.
Đây là phép quan sát metadata cấp bảng/collection, không đo toàn bộ volume, journal hay backup.
