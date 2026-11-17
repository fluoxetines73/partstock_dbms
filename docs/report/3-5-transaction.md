# 3.5. Transaction · D

Câu hỏi: khi xác nhận hoặc hủy đơn bán bị lỗi giữa chừng, chứng từ, tồn và sổ biến động có còn nhất quán không?
Lượt chạy 17/11/2026 trên MySQL 8.4.13 (InnoDB, `REPEATABLE-READ`) và MongoDB 8.0.34 (rs0 một node,
transaction nhiều document, `readConcern: snapshot`, `writeConcern: majority`). Cùng 4 sản phẩm, 6 đơn nháp và
10 ca. MySQL chạy đúng mã `backend/src/sales.ts` của ứng dụng; lỗi được gây bằng trigger trong schema lab dùng
một lần. [Script và hướng dẫn](../../experiments/transactions/README.md) ·
[Kết quả](../../experiments/transactions/results-local.json).

**Cơ chế.** Một transaction bao trọn: đổi trạng thái đơn có điều kiện, trừ tồn từng dòng bằng một câu cập nhật có điều kiện
`quantity_on_hand >= q`, rồi ghi biến động. MySQL ràng buộc thêm bằng `CHECK (quantity_on_hand >= 0)` và khóa UNIQUE
`(movement_type, dòng đơn)`. MongoDB không có CHECK hay khóa ngoại nên dựa vào điều kiện trong câu cập nhật và unique index
của sổ biến động; các ràng buộc còn lại do logic ứng dụng giữ.

| Ca | Điểm gây lỗi | MySQL | MongoDB |
|---|---|---|---|
| 1 | Không lỗi | commit, tồn RAM-KIN-08 8→5, RAM-KIN-16 5→3, 2 biến động `SALE` | giống |
| 2 | Sau khi đổi trạng thái đơn, trước khi trừ tồn | rollback, đơn vẫn nháp, trạng thái như ca 1 | giống |
| 3 | Sau khi trừ tồn dòng 1, trước khi ghi biến động | rollback, tồn dòng 1 được hoàn nguyên | giống |
| 4 | Dòng 2 thiếu tồn | rollback cả dòng 1, lỗi `INSUFFICIENT_STOCK` | giống |
| 5 | Mất kết nối trước COMMIT | `KILL CONNECTION` phiên đang giữ giao tác; server hủy, không dấu vết | kết thúc session khi transaction còn mở; server hủy, không dấu vết |
| 6, 8 | Gửi lại xác nhận / hủy | bị từ chối, không đổi tồn hay sổ | giống |
| 7 | Hủy đơn đã xác nhận | tồn về giá trị đầu, thêm 2 `SALE_CANCEL` | giống |
| 9 | Xác nhận lại đơn từng lỗi ở ca 2 | thành công | giống |
| 10 | Cùng lỗi ca 3, **không** dùng transaction | tồn đã trừ, đơn đã `CONFIRMED`, không có biến động: I2 và I4 sai | giống |

Mọi ca 1–9 giữ bất biến I1 (tồn ≥ 0), I2 (tồn = tổng biến động), I4 (số biến động mỗi dòng khớp trạng thái đơn),
và trạng thái cuối của hai hệ khớp nhau (38/38 kiểm tra). Ca 10 cho thấy vì sao cần transaction: nếu mỗi câu lệnh
tự commit, lỗi sau câu cập nhật tồn để lại tồn đã trừ mà không có đơn hay biến động tương ứng, và không có gì tự sửa lại.

Khác biệt model đáng ghi: MySQL tách đơn và dòng đơn, kiểm tra tồn âm bằng CHECK và liên kết biến động với dòng bằng khóa ngoại ghép
`(dòng, sản phẩm)`; MongoDB nhúng dòng vào đơn nên đổi trạng thái đơn và đọc dòng là cùng một document. Với ca 5, lượt này mới chứng minh
việc server hủy giao tác chưa commit; chưa kiểm chứng phục hồi sau sập DBMS hoặc mất nguồn.

**Phạm vi kết luận.** Một node MongoDB nên không có failover; chưa đo hiệu năng và không kết luận hệ nào nhanh hơn.
Tranh chấp đồng thời giữa các phiên thuộc chủ đề Concurrency (E); phần MySQL của chúng đã được kiểm thử ở
[test ứng dụng](../../backend/tests-db/uc04-07-08.cjs).
[MySQL 8.4: InnoDB Transaction Model](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html) ·
[MongoDB 8.0: Transactions](https://www.mongodb.com/docs/v8.0/core/transactions/).
