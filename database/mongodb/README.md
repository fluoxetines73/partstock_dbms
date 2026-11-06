# MongoDB

Chưa có model nghiệp vụ. Chỉ phục vụ thực nghiệm đối chiếu, không đồng bộ với app.
Đã có cấu hình local MongoDB 8.0.34, replica set rs0 một node, xác thực keyfile và user lab
readWrite theo [hướng dẫn](../../setup-local-docker.md). Transaction hai document commit/rollback
và persistence đã được kiểm chứng trên một máy; xem [bằng chứng](../../KIEM-TRA.md).
Đây là đề xuất triển khai cho PR, chờ B–D/A review; không suy ra khả năng dự phòng/failover.
B–D thống nhất phiên bản/topology trước mốc thiết kế 06/11/2026;
không giả định standalone đủ cho transaction nhiều document. Chưa có đồng thuận triển khai toàn nhóm.
Model embed/reference có thể khác MySQL, nhưng giữ cùng nghiệp vụ/dữ liệu logic và ghi khác biệt.
Schema validation/index và seed sẽ được quản lý tại đây hoặc database/seed theo quyết định nhóm.
Kết nối lab tách riêng; script phá hủy cần kiểm tra đích và hướng dẫn reset rõ ràng.
