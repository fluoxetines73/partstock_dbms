# F03 — Quy tắc chứng từ, hủy/doanh thu và cập nhật kho

**Bản nháp đề xuất 10/11/2026.** D soạn; chờ E đồng soạn/duyệt phần kho và kiểm kê,
C rà phần doanh thu, A điều phối nhóm chốt. Chưa phải quyết định nhóm, chưa có code hay
kết quả chạy nào kiểm chứng nội dung dưới đây. Khi chốt, ghi vào [sổ quyết định](../../agent/decisions.md).

Phạm vi: UC04 (nhập), UC07 (bán), UC08 (hủy) và các quy tắc ảnh hưởng UC09 (lịch sử),
UC11 (doanh thu), UC12 (kiểm kê). Tên bảng/cột tham chiếu [F04 — ERD miền D](f04-erd-mien-d.md).
Các ràng buộc đã chốt theo [yêu cầu](../requirements.md) được giữ nguyên: nháp không đổi kho,
không bán vượt tồn, không hoàn kho lặp, lưu giá tại thời điểm bán, sản phẩm có lịch sử chỉ ngừng kinh doanh.

## 1. Trạng thái chứng từ

### Phiếu nhập (UC04)

```text
DRAFT ──xác nhận──▶ CONFIRMED
  │
  └──xóa (vật lý, cùng các dòng)
```

- `DRAFT`: thêm/sửa/xóa dòng tự do; không tác động kho.
- `CONFIRMED`: khóa nội dung, tồn tăng theo từng dòng, ghi biến động `IMPORT`.
- **Đề xuất:** không hủy phiếu nhập đã xác nhận (hàng có thể đã bán). Nhập sai xử lý bằng
  kiểm kê/điều chỉnh có lý do (UC12). Cần nhóm xác nhận vì ảnh hưởng UC12 của E.

### Đơn bán (UC07, UC08)

```text
DRAFT ──xác nhận──▶ CONFIRMED ──hủy (có lý do)──▶ CANCELLED
  │
  └──xóa (vật lý, cùng các dòng)
```

- `DRAFT`: không tác động kho; giá dòng chỉ là giá tạm để hiển thị.
- `CONFIRMED`: trừ tồn, chốt giá dòng, ghi biến động `SALE`.
- `CANCELLED`: hoàn đủ số lượng mọi dòng, ghi biến động `SALE_CANCEL`; trạng thái cuối, không mở lại.
- Hủy toàn bộ đơn, không hủy một phần; bắt buộc nhập lý do.
- **Đề xuất:** không giới hạn thời gian hủy (không có bảo hành/đổi trả trong phạm vi).
  Phương án khác: chỉ hủy trong ngày xác nhận — chọn khi nhóm muốn hạn chế sửa doanh thu quá khứ.
- Đơn nháp không "hủy" mà xóa; thao tác này là ví dụ **delete** trong 8 dạng thao tác.

### Quy tắc chung cho chứng từ

- Chứng từ đã `CONFIRMED`/`CANCELLED` không sửa dòng, không xóa.
- Sản phẩm `DISCONTINUED` không được thêm vào nháp mới và không được xác nhận nhập/bán;
  vẫn được hủy đơn cũ chứa sản phẩm đó (hoàn kho bình thường).
- Một chứng từ không có hai dòng cùng sản phẩm (gộp số lượng).
- Chứng từ phải có ít nhất một dòng mới được xác nhận.

## 2. Giá và doanh thu (C rà)

- Dòng nhập lưu `unit_cost` do nhân viên nhập. Dòng bán lưu `unit_price`.
- **Giá bán chốt tại lúc xác nhận:** trong transaction xác nhận, `unit_price` của từng dòng được
  ghi lại từ giá hiện hành của sản phẩm. Sau đó đổi giá sản phẩm không ảnh hưởng đơn đã xác nhận.
- Không có chiết khấu/thuế trong phạm vi (cần nhóm xác nhận). Tổng tiền không lưu ở đầu đơn,
  tính bằng `SUM(quantity * unit_price)` để tránh thêm một bất biến phải đồng bộ.
- **Doanh thu — đề xuất phương án A:** chỉ tính đơn đang `CONFIRMED`, nhóm theo `confirmed_at`.
  Đơn bị hủy bị loại hẳn, nên doanh thu một kỳ đã qua có thể giảm khi đơn của kỳ đó bị hủy sau.
- Phương án B: ghi nhận dương tại `confirmed_at`, âm tại `cancelled_at`; báo cáo kỳ cũ không đổi
  nhưng truy vấn phức tạp hơn. C chọn theo nhu cầu UC11.
- Mốc thời gian: đề xuất lưu `DATETIME(3)` theo giờ Việt Nam vì chỉ một cửa hàng; F06 chốt quy ước.
  Tiền: `DECIMAL(15,0)` (VND không có phần lẻ).

## 3. Cơ chế cập nhật kho (D–E dùng chung)

### Mô hình

- `inventory`: một dòng mỗi sản phẩm, `quantity_on_hand >= 0` (CHECK). Dòng được tạo với số lượng 0
  cùng transaction tạo sản phẩm (**phụ thuộc B, UC02**), nên luồng kho luôn `UPDATE`, không cần upsert.
- `stock_movements`: sổ biến động chỉ thêm, không sửa/xóa. Mỗi dòng có loại, số lượng có dấu,
  tồn sau biến động và tham chiếu đúng **một** dòng chứng từ nguồn.
- Chống lặp hai lớp: (1) đổi trạng thái có điều kiện trên đầu chứng từ; (2) khóa UNIQUE
  `(movement_type, dòng chứng từ)` trong `stock_movements`, nên kể cả lỗi logic ở lớp 1 thì
  DB cũng từ chối ghi `SALE_CANCEL` lần hai cho cùng dòng.
- Tồn đầu kỳ trong seed tạo bằng phiếu nhập đã xác nhận, không có loại biến động "đầu kỳ" riêng,
  để bất biến tồn = tổng biến động luôn đúng.

### Xác nhận đơn bán — một transaction MySQL

```text
START TRANSACTION
1. UPDATE sales_orders SET status='CONFIRMED', confirmed_at=NOW(3)
   WHERE id=:id AND status='DRAFT'
   → 0 dòng: ROLLBACK, lỗi ORDER_NOT_DRAFT (đã xác nhận/đã hủy/đã xóa)
   (câu này cũng giữ khóa X trên đầu đơn, nên hai yêu cầu xác nhận cùng đơn bị tuần tự hóa)
2. Đọc các dòng của đơn kèm sản phẩm (SELECT ... FOR SHARE trên products)
   → không có dòng: ROLLBACK, EMPTY_DOCUMENT; sản phẩm DISCONTINUED: ROLLBACK, PRODUCT_DISCONTINUED
3. Với từng dòng, theo product_id tăng dần (cố định thứ tự khóa để giảm deadlock):
   a. UPDATE inventory SET quantity_on_hand = quantity_on_hand - :q
      WHERE product_id=:p AND quantity_on_hand >= :q
      → 0 dòng: ROLLBACK, INSUFFICIENT_STOCK (kèm sản phẩm, số yêu cầu, số đang có)
   b. SELECT quantity_on_hand FROM inventory WHERE product_id=:p   -- đọc tồn sau cập nhật của chính mình
   c. UPDATE sales_order_lines SET unit_price = <giá hiện hành> WHERE id=:line
   d. INSERT stock_movements (SALE, -:q, tồn sau, sales_order_line_id=:line)
COMMIT
Bất kỳ lỗi nào ở giữa → ROLLBACK toàn bộ; không có trạng thái "xác nhận một nửa".
```

- **Không** đọc tồn bằng `SELECT` thường rồi mới quyết định trừ: đó là snapshot read, hai phiên
  cùng thấy tồn cũ và gây bán vượt tồn/mất cập nhật. Câu `UPDATE ... WHERE quantity_on_hand >= :q`
  kiểm tra và ghi nguyên tử trên khóa dòng, đúng ở cả REPEATABLE READ (mặc định InnoDB) và READ COMMITTED.
- `SELECT ... FOR UPDATE` rồi `UPDATE` cũng đúng; app dùng phương án câu điều kiện vì ngắn hơn.
  LAB-E có thể so sánh cả ba cách (đọc rồi ghi ngây thơ, `FOR UPDATE`, câu điều kiện).
- Deadlock (MySQL 1213): backend chạy lại toàn bộ transaction tối đa 3 lần rồi báo lỗi.
  Hết thời gian chờ khóa (1205): báo lỗi để người dùng thử lại. Thuộc phần xử lý lỗi chung F09 (A).

### Xác nhận phiếu nhập

Giống đơn bán: `UPDATE purchase_receipts ... WHERE status='DRAFT'`, kiểm tra có dòng và sản phẩm
chưa ngừng kinh doanh, rồi theo `product_id` tăng dần: `quantity_on_hand = quantity_on_hand + :q`,
đọc tồn sau, ghi biến động `IMPORT`. Không cần điều kiện tồn.

### Hủy đơn bán

```text
START TRANSACTION
1. UPDATE sales_orders SET status='CANCELLED', cancelled_at=NOW(3), cancel_reason=:r
   WHERE id=:id AND status='CONFIRMED'
   → 0 dòng: ROLLBACK, ORDER_NOT_CANCELLABLE (nháp, đã hủy, không tồn tại)
2. Với từng dòng theo product_id tăng dần:
   UPDATE inventory SET quantity_on_hand = quantity_on_hand + :q WHERE product_id=:p
   đọc tồn sau; INSERT stock_movements (SALE_CANCEL, +:q, tồn sau, sales_order_line_id=:line)
   → vi phạm UNIQUE: ROLLBACK (lớp chống lặp thứ hai)
COMMIT
```

Hai yêu cầu hủy đồng thời: phiên sau chờ khóa đầu đơn ở bước 1, đến lượt thì thấy trạng thái đã
`CANCELLED`, cập nhật 0 dòng và bị từ chối. Bấm hủy hai lần hoặc client tự gửi lại đều cho cùng kết quả.

### Sửa và xóa nháp

- Mọi thao tác thêm/sửa/xóa dòng bắt đầu bằng `SELECT status FROM <đầu chứng từ> WHERE id=:id FOR UPDATE`
  trong cùng transaction; khác `DRAFT` thì từ chối. Nhờ đó không thể sửa dòng trong lúc phiên khác đang xác nhận.
- Xóa nháp: `DELETE FROM sales_orders WHERE id=:id AND status='DRAFT'`; dòng xóa theo `ON DELETE CASCADE`.
  Chứng từ đã xác nhận còn được bảo vệ thêm bởi FK `RESTRICT` từ `stock_movements` tới dòng chứng từ.

## 4. Kiểm kê khi đang có giao dịch (UC12 — E quyết định, D đề xuất)

- Phiên kiểm kê ghi, cho từng sản phẩm, `system_quantity` (tồn hệ thống lúc đếm) và `counted_quantity` (đếm thực tế).
- Khi xác nhận điều chỉnh: `delta = counted_quantity - system_quantity`; áp vào tồn **hiện tại** bằng
  `UPDATE inventory SET quantity_on_hand = quantity_on_hand + :delta WHERE product_id=:p AND quantity_on_hand + :delta >= 0`,
  ghi biến động `ADJUSTMENT` kèm lý do bắt buộc. `delta = 0` thì không ghi biến động.
- Lý do dùng delta: nếu ghi đè tồn bằng số đếm, các đơn bán xác nhận giữa lúc đếm và lúc xác nhận
  kiểm kê sẽ bị "mất" khỏi tồn. Giả định: hàng đã đếm phản ánh trạng thái tại thời điểm ghi `system_quantity`.
- Chống xác nhận kiểm kê lặp theo cùng mẫu: đổi trạng thái có điều kiện + UNIQUE trên biến động.

## 5. Bất biến để kiểm thử (QA-01, LAB-D, LAB-E)

| Mã | Bất biến |
|---|---|
| I1 | `inventory.quantity_on_hand >= 0` với mọi sản phẩm |
| I2 | `quantity_on_hand` = tổng `quantity_delta` của sản phẩm trong `stock_movements` |
| I3 | Dòng phiếu nhập `CONFIRMED` có đúng một biến động `IMPORT`; dòng phiếu nháp không có biến động |
| I4 | Dòng đơn `CONFIRMED`: đúng một `SALE`, không có `SALE_CANCEL`. Đơn `CANCELLED`: đúng một `SALE` và một `SALE_CANCEL`. Đơn nháp: không có biến động |
| I5 | `quantity_delta` của biến động bằng ± số lượng dòng nguồn, đúng dấu theo loại |
| I6 | Giá dòng đơn đã xác nhận không đổi khi giá sản phẩm đổi |

Truy vấn mẫu, **chưa chạy** vì chưa có schema:

```sql
-- I2: các sản phẩm có tồn lệch sổ biến động (kết quả đúng là rỗng)
SELECT i.product_id, i.quantity_on_hand, COALESCE(SUM(m.quantity_delta), 0) AS ledger_sum
FROM inventory i
LEFT JOIN stock_movements m ON m.product_id = i.product_id
GROUP BY i.product_id, i.quantity_on_hand
HAVING i.quantity_on_hand <> ledger_sum;

-- I4: dòng đơn có số biến động sai so với trạng thái đơn (kết quả đúng là rỗng)
SELECT l.id, o.status,
       SUM(m.movement_type = 'SALE') AS sale_cnt, SUM(m.movement_type = 'SALE_CANCEL') AS cancel_cnt
FROM sales_order_lines l
JOIN sales_orders o ON o.id = l.order_id
LEFT JOIN stock_movements m ON m.sales_order_line_id = l.id
GROUP BY l.id, o.status
HAVING NOT ((o.status = 'DRAFT' AND sale_cnt = 0 AND cancel_cnt = 0)
         OR (o.status = 'CONFIRMED' AND sale_cnt = 1 AND cancel_cnt = 0)
         OR (o.status = 'CANCELLED' AND sale_cnt = 1 AND cancel_cnt = 1));
```

## 6. Lỗi giữa chừng — điểm chèn lỗi cho LAB-D

Chỉ chèn lỗi trong script lab trên `partstock_lab`, không thêm cờ gây lỗi vào app:

1. Sau khi đổi trạng thái đơn, trước khi trừ tồn.
2. Sau khi trừ tồn, trước khi ghi biến động (kịch bản trong README chủ đề transaction).
3. Dòng 1 trừ tồn thành công, dòng 2 thiếu tồn → toàn bộ đơn rollback, dòng 1 hoàn nguyên.
4. Ngắt kết nối trước `COMMIT`.
5. Gửi lại yêu cầu hủy đã thành công.

Sau mỗi ca: kiểm tra I1–I5 và trạng thái chứng từ trước/sau.

## 7. Ghi chú cho model MongoDB lab (F08, B hợp nhất; B–D rà)

- Đơn bán/phiếu nhập là một document nhúng mảng dòng; mỗi dòng có `_id` riêng để biến động tham chiếu.
- `inventory` là collection riêng (một document mỗi sản phẩm) vì nhiều đơn cùng cập nhật một sản phẩm.
- Trừ tồn: `updateOne({product_id, quantity_on_hand: {$gte: q}}, {$inc: {quantity_on_hand: -q}})`,
  `matchedCount = 0` nghĩa là thiếu tồn. Đổi trạng thái: `updateOne({_id, status: "DRAFT"}, {$set: ...})`.
- `stock_movements` có unique index `{movement_type: 1, line_id: 1}`.
- Cả chuỗi chạy trong transaction nhiều document trên `rs0` (đã kiểm chứng hạ tầng ở [KIEM-TRA](../../KIEM-TRA.md)),
  `readConcern: snapshot`, `writeConcern: majority`. Lỗi `TransientTransactionError` thì chạy lại transaction.
- Khác biệt cần ghi trong báo cáo: MongoDB không có FK/CHECK tương đương; ràng buộc dựa vào
  schema validation, unique index và logic ứng dụng.

## 8. Câu hỏi cần nhóm chốt hôm nay

| # | Câu hỏi | Đề xuất của D | Người chốt |
|---|---|---|---|
| Q1 | Có hủy phiếu nhập đã xác nhận không? | Không; sửa sai bằng kiểm kê | A, E |
| Q2 | Giới hạn thời gian hủy đơn? | Không giới hạn, bắt buộc lý do | A, C |
| Q3 | Doanh thu sau hủy: phương án A hay B? | A | C |
| Q4 | Có chiết khấu/thuế không? | Không | A |
| Q5 | Kiểm kê áp delta hay ghi đè tồn? | Delta | E |
| Q6 | B tạo dòng `inventory` cùng lúc tạo sản phẩm? | Có | B |
| Q7 | Lưu thông tin khách hàng trên đơn? | Chỉ tên tùy chọn, không dữ liệu cá nhân thật trong seed | A |
| Q8 | Có bảng người dùng để ghi người tạo/xác nhận chứng từ? | Chưa, ngoài phạm vi | A |
