# Báo cáo tiến độ thực nghiệm concurrency

**Role E · PartStock · 24/11/2026**

Đã hoàn thành bộ thực nghiệm kiểm soát đồng thời cho **UC09 – lịch sử kho, UC10 – cảnh báo tồn thấp và UC12 – kiểm kê**. MySQL 8.4.13 và MongoDB 8.0.34 đã chạy cùng 32 ca trên máy của Hải. Cả hai hệ đạt **32/32**. Mục tiêu của bộ thử là kiểm tra tính đúng đắn của tồn kho, chứng từ và sổ biến động khi nhiều giao dịch cùng đọc hoặc ghi.

## Thành phần của thí nghiệm

| Thư mục | Nội dung |
|---|---|
| [mysql/](mysql/) | Schema lab, truy vấn lịch sử và cảnh báo, giao dịch xác nhận kiểm kê có khóa dòng. Bộ thử gọi lại các hàm tạo sản phẩm, nhập, bán và hủy của ứng dụng. |
| [mongodb/](mongodb/) | Mô hình chứng từ, tồn kho và sổ biến động trên replica set rs0. Giao dịch đọc dùng snapshot, giao dịch ghi dùng write concern majority. |
| [stock-ucs/](stock-ucs/) | Dữ liệu mẫu, 32 ca kiểm tra chung, bộ chạy và mã đối chiếu SQLite. |
| [evidence/](evidence/) | JSON theo từng ca với kết quả thực tế, kết quả mong đợi và trạng thái. Có thêm log của demo hai đơn tranh mua món cuối. |

## Kết quả quan sát trên MySQL và MongoDB

| Nghiệp vụ | Tình huống đã chạy | Kết quả |
|---|---|---|
| UC09 · Lịch sử kho | Tra cứu theo khoảng thời gian và loại biến động. Đọc hai lần trong cùng snapshot khi phiên khác bán 2 sản phẩm. | Truy đúng chứng từ nhập, bán, hủy. Bộ lọc chi tiết giữ đúng số dư đầu và cuối kỳ. Phiên đọc đang mở vẫn thấy tồn 10, phiên đọc mới thấy 8. |
| UC10 · Cảnh báo tồn thấp | Đặt ngưỡng 9, bán từ tồn 10 xuống 8, sau đó hủy đơn. Kiểm tra thêm tồn bằng ngưỡng, ngưỡng 0, ngưỡng âm và SKU chưa cấu hình. | Khi tồn còn 8, SKU xuất hiện trong danh sách với lượng thiếu 1. Hủy đơn đưa tồn về 10 và xóa cảnh báo. Giá trị bằng ngưỡng được xử lý đúng, ngưỡng âm bị từ chối. |
| UC12 · Kiểm kê | Tồn lúc đếm là 10, thực đếm 9, bán 2 trước khi xác nhận phiếu. Hai phiên cùng duyệt một phiếu ở ca riêng. | Chênh lệch −1 được áp vào tồn hiện tại 8, cho tồn cuối 7. Sổ kho lưu lý do và mã phiếu. Khi hai phiên cùng duyệt, chỉ một phiên ghi điều chỉnh. |
| UC12 · Rollback và thử lại | Gây lỗi sau khi cập nhật tồn và trước khi ghi sổ. Xác nhận lại cùng phiếu. | Giao dịch lỗi trả phiếu về nháp và giữ nguyên tồn. Lần thử lại ghi đúng một điều chỉnh. |
| Tranh chấp khi bán | Hai đơn cùng mua đơn vị cuối. Ở ca khác, một đơn bán và một phiếu kiểm kê cùng cập nhật một SKU. | Chỉ một đơn mua được món cuối. Khi bán và kiểm kê đồng thời, cả hai thay đổi đều được ghi nhận. Cuối bộ thử, tồn của cả sáu SKU khớp tổng biến động. |

## Bằng chứng và cách tái hiện

- **MySQL · 32/32**, chạy ngày 22/11. Xem mục có target là mysql trong [JSON kết quả](evidence/2026-11-22/uc-all-2026-11-22T01-53-51-093Z-52dbb0.json). Trạng thái tổng của tệp bao gồm cả lượt khởi chạy MongoDB bị lỗi.
- **MongoDB · 32/32**, chạy riêng ngày 22/11. [JSON kết quả](evidence/2026-11-22/uc-mongodb-2026-11-22T02-29-31-496Z-2e5ea0.json)
- **SQLite · 32/32**, chạy đối chiếu ngày 24/11 với cấu trúc thư mục hiện tại.

Từ gốc dự án đã chuẩn bị hai dịch vụ lab và build backend, chạy `bash experiments/concurrency/run-role-e.sh stock-ucs`. Kết quả được lưu trong `role-e-results/`. [Hướng dẫn chạy](README.md)
