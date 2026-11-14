# Backup/restore

## Mục tiêu và owner
Kiểm chứng cơ chế Backup/restore trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner **B (Tuấn)**. Đã chạy thủ công trên cả hai lab ngày 14/11/2026 và đối chiếu đạt.
Hai script chạy lại cũng đã PASS trên đích lab mới. Chờ **E (Hải)** kiểm chứng độc lập.

## Chạy lại trên lab

Từ PowerShell ở gốc repo, xác nhận `mysql-lab` và `mongo-lab` đang healthy.
MongoDB cần `rs0 PRIMARY`. [setup-local-docker.md](../../setup-local-docker.md)

```powershell
$compose = @('compose','--env-file','.env.docker','-f','compose.local.yaml')
docker @compose ps mysql-lab mongo-lab
Get-Content -Raw ./experiments/backup-restore/mysql.sh | docker @compose exec -T mysql-lab bash -o pipefail -c "tr -d '\r' | bash"
Get-Content -Raw ./experiments/backup-restore/mongodb.sh | docker @compose exec -T mongo-lab bash -o pipefail -c "tr -d '\r' | bash"
```

Chạy từng lệnh và kiểm tra exit code trước khi tiếp tục. Mỗi script nạp fixture vào
database nguồn mới, đọc baseline, dump và restore vào đích lab mới có tên riêng.
Script in `PASS` khi số liệu nguồn và đích đều khớp bảng dưới. Dòng `Files=` cho biết
thư mục chứa `backup.log`, `restore.log`, `tool-version.txt`, `dump-bytes.txt` và file
`before`/`after` trong container. Source, target và dump được giữ để đối chiếu.
[mysql.sh](mysql.sh) · [mongodb.sh](mongodb.sh)

Hải chạy hai script trên lab của mình và phản hồi PASS/FAIL theo từng hệ, kèm số liệu
nguồn/đích và lỗi nếu có. Thời gian và dung lượng là số liệu của từng lượt chạy.

## Kết quả ngày 14/11/2026

Tuấn chạy một lượt trên mỗi hệ với cùng fixture nghiệp vụ. Hai đích restore được
chuẩn bị sạch trên lab. Số liệu lấy từ log của phiên Bash trong hai container.

| Hệ | Backup (s) | Restore (s) | Dump (bytes) | Đối chiếu nguồn/đích |
|---|---:|---:|---:|---|
| MySQL (`mysqldump` → `mysql`) | 0,078 | 0,115 | 4.491 | PASS |
| MongoDB (`mongodump` → `mongorestore`) | 1,142 | 0,117 | 1.781 | PASS |

| Chỉ số | MySQL trước/sau | MongoDB trước/sau |
|---|---:|---:|
| Sản phẩm | 2 / 2 | 2 / 2 |
| Đơn đã xác nhận | 1 / 1 | 1 / 1 |
| Dòng đơn | 2 / 2 | 2 / 2 |
| Dòng tồn | 2 / 2 | 2 / 2 |
| Tổng tồn (đơn vị) | 11 / 11 | 11 / 11 |
| Tổng tiền đơn xác nhận (VND) | 1.830.000 / 1.830.000 | 1.830.000 / 1.830.000 |

MongoDB phục hồi 5 documents, 0 lỗi. Hai dòng đơn nằm trong document đơn bán.
MySQL lưu dòng đơn ở bảng riêng. Fixture chứng từ và tồn dùng riêng cho bài lab.
Thời gian trong bảng là elapsed time của lượt chạy tay với fixture nhỏ. Log gốc
đã được chép về `experiments/backup-restore/artifacts/2026-11-14/` trên máy Tuấn.

Lượt xác minh hai script dùng MySQL Database Client `mysqldump` 8.4.13 và MongoDB Database
Tools `mongodump`/`mongorestore` 100.20.0. Cả hai PASS trên đích mới với đúng các số liệu
nguồn/đích trên. MongoDB restore 5 documents với 0 lỗi.

## Câu hỏi cần kiểm chứng
Backup có phục hồi đủ dữ liệu và tổng nghiệp vụ trên DB sạch?

## Phương pháp
- MySQL dùng `mysqldump --single-transaction` trên các bảng InnoDB, rồi import SQL vào schema mới.
- MongoDB dùng `mongodump --archive` và `mongorestore --nsFrom/--nsTo` để restore vào namespace lab mới.
- Dữ liệu nguồn giữ nguyên trong lúc backup. Hai script ghi elapsed time và số byte dump.

## Đầu vào
Cùng snapshot logic đã biết số lượng sản phẩm/chứng từ/dòng và tổng tồn/tổng tiền.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Lệnh/cấu hình đã che bí mật, log backup/restore, thời gian/kích thước, đối chiếu số lượng và tổng nghiệp vụ trước/sau; B thực hiện, E xác minh.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chạy lại script sẽ tạo nguồn và đích với tên mới. Giữ dump và log thô ở thư mục local
đã được Git ignore.

## Giới hạn bài bổ sung
Dữ liệu không thay đổi trong lúc backup. Chỉ giả lập mất dữ liệu trên lab đã xác minh;
restore vào DB sạch tách app, đối chiếu số lượng và tổng nghiệp vụ bằng kiểm tra độc lập của E.
Recovery nội bộ DBMS khác backup/restore quản trị. Không triển khai replication/failover/PITR;
phần này không thay thế năm chủ đề và không mặc nhiên bảo đảm bonus.
