# Thực nghiệm hai DBMS

Chưa triển khai script, chưa có lệnh chạy hay kết quả. Các README là kịch bản dự kiến.
Schema/seed dùng chung ở [database](../database/README.md); kịch bản và kết quả ở đây.

| Chủ đề | Owner | Kế hoạch |
|---|---|---|
| Storage & management | A | [storage](storage/README.md) |
| Indexing | B | [indexing](indexing/README.md) |
| Query processing | C | [query-processing](query-processing/README.md) |
| Transaction | D | [transactions](transactions/README.md) |
| Concurrency control | E | [concurrency](concurrency/README.md) |
| Backup/restore bổ sung | B, E kiểm chứng | [backup-restore](backup-restore/README.md) |

Mỗi chủ đề bắt buộc chạy trên cả MySQL và MongoDB. Cùng nghiệp vụ/dữ liệu logic, cho phép
model phù hợp từng hệ nhưng phải ghi khác biệt. Thu script, đầu vào, phiên bản/topology/cấu hình,
quy mô, index, điều kiện cache, số lần chạy, log/kế hoạch/số đo và giải thích cơ chế.
Ghi cách tính thống kê, lần lỗi và giới hạn; không kết luận hệ thắng từ một lần đo.
Tách app `partstock` và lab `partstock_lab` bằng cấu hình/kết nối/quyền riêng.
Reset chỉ trên lab đã xác minh, có script tái nạp và đối chiếu seed khi được triển khai.
Kết quả tổng hợp nhỏ phục vụ báo cáo giữ trong Git; backup/dump và artifact lớn không commit.
