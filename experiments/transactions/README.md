# Transaction · D

Kiểm chứng commit/rollback trên MySQL và MongoDB cho đúng nghiệp vụ PartStock: xác nhận
và hủy đơn bán phải giữ **chứng từ – tồn – biến động** nhất quán dù lỗi xảy ra ở giữa chừng.
Quy tắc nghiệp vụ ở [F03](../../docs/architecture/f03-quy-tac-chung-tu-kho.md), bảng ở
[F04](../../docs/architecture/f04-erd-mien-d.md), báo cáo ở [3.5](../../docs/report/3-5-transaction.md).

## Cách làm

- **MySQL chạy đúng code của ứng dụng.** `run.cjs` tạo schema dùng một lần `partstock_tx_*` trên `mysql-lab`,
  áp migration 001–003 và seed 001–003, rồi gọi `sales.confirm` / `sales.cancel` trong
  [backend/src/sales.ts](../../backend/src/sales.ts). Không thêm cờ lỗi vào app (F03 §6): lỗi được gây
  từ trong database bằng trigger ở [mysql-faults.sql](mysql-faults.sql), chỉ tồn tại trong schema lab này.
- **MongoDB** dùng [mongodb.js](mongodb.js): đơn là một document nhúng dòng, `inventory` và sổ biến động là
  collection riêng, unique index `{movement_type, line_id}`, một transaction nhiều document trên `rs0`
  (`readConcern: snapshot`, `writeConcern: majority`, tự chạy lại khi `TransientTransactionError`).
  Collection mang tiền tố `tx_<runId>_` và bị xóa khi chạy xong.
- Cùng dữ liệu logic (4 sản phẩm, 6 đơn nháp) và cùng 10 ca trên hai hệ. Sau mỗi ca script chụp trạng thái
  (trạng thái đơn, tồn, số biến động) và kiểm tra bất biến I1 (tồn ≥ 0), I2 (tồn = tổng biến động),
  I4 (số biến động của mỗi dòng khớp trạng thái đơn). Runner dừng ngay nếu hai hệ khác nhau.

| # | Ca | Kết quả mong đợi (cả hai hệ) |
|---|---|---|
| 1 | Xác nhận đơn hai dòng, không lỗi | `CONFIRMED`, tồn trừ đúng, 2 biến động `SALE` |
| 2 | Lỗi sau khi đổi trạng thái đơn, trước khi trừ tồn | `FAULT_INJECTED`, trạng thái như sau ca 1 |
| 3 | Lỗi sau khi trừ tồn dòng 1, trước khi ghi biến động | `FAULT_INJECTED`, tồn dòng 1 được hoàn nguyên |
| 4 | Dòng 1 trừ được, dòng 2 thiếu tồn | `INSUFFICIENT_STOCK`, toàn đơn quay lại |
| 5 | Ghi xong mọi thứ, mất kết nối trước COMMIT | `CONNECTION_LOST`, trạng thái như sau ca 1 |
| 6 | Gửi lại xác nhận đơn đã xác nhận | `ORDER_NOT_DRAFT`, không đổi |
| 7 | Hủy đơn đã xác nhận | `CANCELLED`, tồn về giá trị đầu, thêm 2 biến động `SALE_CANCEL` |
| 8 | Gửi lại yêu cầu hủy | `ORDER_NOT_CANCELLABLE`, không hoàn kho lần hai |
| 9 | Xác nhận lại đơn từng lỗi ở ca 2 | `CONFIRMED` (lỗi trước đó không để lại dấu vết) |
| 10 | **Đối chứng:** cùng lỗi ca 3 nhưng không dùng transaction | `FAULT_INJECTED` và I2, I4 bị vi phạm |

Ca 5: MySQL gắn `SLEEP` vào trigger sổ biến động rồi runner `KILL CONNECTION` đúng phiên đang giữ giao tác.
MongoDB mô phỏng bằng cách kết thúc session khi transaction còn mở (chưa `commitTransaction`), nên đây là
tắt client chứ không phải cắt mạng. Ca 10 cố ý để lại trạng thái sai trong schema/collection dùng một lần.

## Chạy lại

Yêu cầu: `.env.docker`, `mysql-lab` và `mongo-lab` healthy, rs0 đã khởi tạo
([hướng dẫn](../../setup-local-docker.md)), `npm ci --prefix backend`. Từ gốc repo (PowerShell hoặc bash):

```powershell
npm run build --prefix backend
node --env-file=.env.docker experiments/transactions/run.cjs > experiments/transactions/results-local.json
```

Script chỉ chạy khi `LAB_MYSQL_*` trỏ đúng `127.0.0.1:3308`/`partstock_lab` và khác cổng app; Mongo được gọi
bằng tài khoản lab trong container và chỉ xóa collection mang đúng tiền tố của lượt chạy. Nếu bị ngắt đột ngột,
chỉ xóa schema `partstock_tx_*` hoặc collection `tx_*` còn sót của lượt đó sau khi đối chiếu tên.
Stdout là JSON; lỗi in `FAIL:` ra stderr và thoát mã 1.

## Kết quả

[results-local.json](results-local.json): **38/38 kiểm tra đạt**, 10 ca trên hai hệ. MySQL 8.4.13 InnoDB, mức cô lập
`REPEATABLE-READ`; MongoDB 8.0.34, replica set `rs0` một node. Chạy ngày 17/11/2026 bởi agent Claude Code theo yêu cầu của
D, trên máy Windows 11 của D (Docker Desktop 29.4.0, 12 CPU, ~7,5 GiB RAM cấp cho engine). Chưa có thành viên
khác tái tạo; E review theo plan.

## Giới hạn

- Một node MongoDB: không kiểm chứng failover, `majority` chỉ là một thành viên. Không có ARM hay máy thứ hai.
- Ca đồng thời (tranh tồn cuối, hai yêu cầu hủy cùng lúc) thuộc chủ đề Concurrency của E. Các ca đó có kiểm tra ở
  [test ứng dụng](../../backend/tests-db/uc04-07-08.cjs) cho MySQL, chưa so với MongoDB trong lab này.
- Không đo hiệu năng; một lượt chạy không đủ để kết luận về tốc độ. Kết quả chỉ nói về tính đúng của commit/rollback.
- Trigger gây lỗi chỉ có ở schema lab dùng một lần; MySQL app (`partstock`) không bị chạm.
