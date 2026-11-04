# Database dùng chung

Chưa triển khai schema/migration/seed. B phụ trách môi trường/seed; A chủ trì chốt thiết kế,
B–E góp phần theo chuyên môn. [MySQL](mysql/README.md) dùng cho app và lab tách biệt;
[MongoDB](mongodb/README.md) chỉ đối chiếu; [seed](seed/README.md) giữ cùng dữ liệu logic.
Schema/migration/seed ở đây; kịch bản kiểm chứng và kết quả ở experiments/.
Tên dự kiến app `partstock`, lab `partstock_lab`: tách cấu hình/kết nối/quyền, không chỉ tên.
Không migration phá dữ liệu; ghi cách áp dụng/rollback phù hợp khi có script thật.
Không commit volume, backup, credential; chưa có Compose hay lệnh thiết lập.
