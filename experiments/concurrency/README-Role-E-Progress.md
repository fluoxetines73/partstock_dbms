# Tiến độ và kết quả Role E · Sprint 1–2

Cập nhật ngày **16/11/2026**. Phạm vi gồm UC09 lịch sử kho, UC10 cảnh báo tồn thấp, UC12 kiểm kê và thực nghiệm Concurrency Control. [Hướng dẫn chạy kiểm thử](README.md).

## Sprint 1 — Thiết kế và phụ thuộc

Đã đối chiếu bộ lab của E với [F03 của Nam](https://github.com/fluoxetines73/partstock_dbms/blob/integration/a-sprint2-review/docs/architecture/f03-quy-tac-chung-tu-kho.md), [ERD tích hợp](https://github.com/fluoxetines73/partstock_dbms/blob/integration/a-sprint2-review/docs/architecture/erd-integrated-review.md) và luồng tạo sản phẩm của Tuấn.

| Phần | Đã thực hiện | Điểm cần chốt để tích hợp |
|---|---|---|
| **Cập nhật kho** | Lab trừ tồn bằng cập nhật có điều kiện và ghi trạng thái đơn, tồn, biến động trong cùng giao tác. F03 cũng đề xuất cập nhật tồn có điều kiện cho luồng bán. | D–E chốt migration `inventory`, `stock_movements`, tham chiếu dòng chứng từ và quy tắc chống xác nhận/hủy lặp. D–E và Tuấn phối hợp tạo dòng tồn `0` cùng giao tác tạo sản phẩm. |
| **UC09** | Có SQL lọc lịch sử theo SKU và khoảng thời gian `[từ, đến)`. | Với schema chung, cần đọc thêm `IMPORT` và `SALE_CANCEL`. Đề xuất Q05 dùng tồn sau biến động cuối trước mỗi mốc. Bộ lọc loại biến động chỉ tác động danh sách hiển thị, còn tồn đầu/cuối kỳ tính từ toàn bộ biến động. |
| **UC10** | Có SQL dùng `quantity < low_threshold` và seed cho ba trường hợp dưới, bằng, trên ngưỡng. | E–B chốt vị trí lưu ngưỡng. Đề xuất cột ngưỡng theo sản phẩm và dùng `NULL` cho sản phẩm chưa cấu hình. |
| **UC12** | Có giao tác thử nghiệm khóa dòng tồn, đối chiếu phiên bản, ghi điều chỉnh và lý do. Số đếm bằng tồn trả `NO_CHANGE`. Số đếm dựa trên phiên bản cũ trả `STALE_COUNT`. | Phiên bản tồn là lựa chọn của lab. F03 đề xuất áp chênh lệch lên tồn hiện tại. D–E cần chốt quy tắc và mốc kiểm kê, rồi thống nhất bảng phiếu kiểm kê, cách lưu kết quả không chênh lệch và khóa chống xác nhận lặp theo phiếu. |

## Sprint 2 — Thay đổi trong code

- `run-role-e.sh mysql` và `mongodb` mở hai phiên tranh một GPU, phát lại yêu cầu của đơn thắng và kiểm tra lịch sử chỉ có một lần xuất.
- `run-role-e.sh uc` kiểm tra UC10 dưới/bằng/trên ngưỡng, UC12 không chênh lệch, điều chỉnh có chênh lệch, từ chối số đếm cũ và UC09 đọc lại biến động. Ca riêng đọc phiên bản tồn, xác nhận một đơn bán, gửi số đếm từ trước khi bán và đối chiếu tồn cuối.
- `mongodb/last-item.js` đưa thao tác `await` vào hàm async để tương thích với cách `mongosh --file` thực thi script. Lỗi cú pháp này được phát hiện khi chạy trên MongoDB thật.
- Script backup/restore của Tuấn giữ trong repo PartStock. Gói này kèm kết quả chạy kiểm chứng.

## Ca đã chuẩn bị để chạy trên bản tích hợp

| Ca | Dữ liệu và kết quả mong đợi | Phụ thuộc |
|---|---|---|
| Nhập → bán → hủy | Tồn `0` → nhập `10` → bán `3` → hủy và hoàn `3`. Tồn lần lượt `10 → 7 → 10`; lịch sử ghi `IMPORT +10`, `SALE -3`, `SALE_CANCEL +3`. | UC04/07/08 của D và schema kho chung. |
| Lỗi giữa chừng | Gây lỗi sau khi cập nhật tồn nhưng trước khi ghi biến động. Sau rollback, đơn vẫn nháp, tồn giữ như trước, không có biến động. | Luồng xác nhận thật của D có cách tái hiện lỗi trong lab tích hợp. |
| Xác nhận hoặc hủy lặp | Gửi hai lần cùng yêu cầu. Mỗi chuyển trạng thái hợp lệ chỉ thay đổi tồn một lần, mỗi nghiệp vụ chỉ có một biến động. | Quy tắc trạng thái/chống lặp D–E. |
| Hai đơn tranh 1 chiếc | Một đơn thành công, một đơn hết hàng, tồn `0` và một biến động xuất gắn đơn thắng. | Đã có ca lab. Cần chạy lại qua luồng bán thật của D. |
| Bán xen giữa lúc kiểm kê | Đếm khi hệ thống còn `10`, thực tế đếm được `9`, sau đó bán `2`. Với phương án phiên bản tồn của E, trả `STALE_COUNT`, tồn vẫn `8`, không ghi điều chỉnh. | D–E chốt phương án kiểm kê trước khi ghi đây là kết quả mong đợi của ứng dụng. |

## Kết quả chạy ngày 16/11/2026

Dùng MySQL **8.4.13** với InnoDB và MongoDB **8.0.34** với replica set một node `rs0` ở trạng thái PRIMARY. Hai DBMS chạy từ đúng image mà PartStock ghim, trên dữ liệu mới và tài khoản lab riêng. Môi trường kiểm tra không có Docker Engine, nên các lệnh bên trong dịch vụ được chạy trực tiếp trong môi trường cô lập từ image. Cần chạy lại lệnh Docker Compose trên máy nhóm để xác nhận khâu khởi động và cấu hình Docker của máy đó.

| Kiểm tra | Kết quả quan sát |
|---|---|
| **MySQL Concurrency — PASS** | B thắng, A báo `OUT_OF_STOCK`. Phát lại B trả `ALREADY_CONFIRMED`. GPU còn `0`, phiên bản `1`, đúng một biến động của B từ `1` xuống `0`. [Log](evidence/mysql.log) |
| **MongoDB Concurrency — PASS** | A thắng, B báo `OUT_OF_STOCK`. Lần này callback của B chạy **22 lần** và của A chạy **1 lần** ở lượt đầu. Phát lại A trả `ALREADY_CONFIRMED`. GPU còn `0`, phiên bản `1`, đúng một biến động của A từ `1` xuống `0`. [Log](evidence/mongodb.log) |
| **MySQL UC09–10–12 — PASS** | Chỉ SKU dưới ngưỡng xuất hiện. Số đếm bằng tồn trả `NO_CHANGE`. Điều chỉnh từ `1` lên `3` ghi đúng một biến động `+2`. Trong ca bán xen giữa, số đếm cũ trả `STALE_COUNT`, tồn giữ `0` và lịch sử chỉ có giao dịch bán. [Log](evidence/mysql-uc.log) |
| **Kiểm chứng restore MySQL — PASS** | Nguồn và đích mới khớp đủ sáu giá trị đối chiếu. [Log](evidence/restore-mysql.log) |
| **Kiểm chứng restore MongoDB — PASS** | Nguồn và đích mới khớp đủ sáu giá trị đối chiếu. `mongorestore` khôi phục **5 document, 0 lỗi**. [Log](evidence/restore-mongodb.log) |

Sáu giá trị đối chiếu restore trên cả hai hệ là **2 sản phẩm, 1 đơn xác nhận, 2 dòng đơn, 2 dòng tồn, tổng tồn 11 và tổng tiền 1.830.000 đồng**. Script restore lấy từ [nhánh tích hợp PartStock](https://github.com/fluoxetines73/partstock_dbms/tree/integration/a-sprint2-review/experiments/backup-restore). Log ghi một lần chạy phục vụ đối chiếu nghiệp vụ. Số lần thử lại của MongoDB, thời gian và dung lượng dump chỉ mô tả lần chạy đó.

**Còn chờ để nghiệm thu bản tích hợp** gồm migration kho và chứng từ, quy tắc kiểm kê D–E, vị trí lưu ngưỡng UC10, luồng tạo tồn ban đầu và kiểm thử trên giao tác nhập–bán–hủy của Nam. Kết quả bảng trên áp dụng cho lab riêng và bộ dữ liệu restore mẫu.
