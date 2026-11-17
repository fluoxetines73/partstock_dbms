# Bàn giao Sprint 1–2 · C — Khánh

Ngày 16/11/2026. Reviewer theo plan là A cho gói C và B cho khung UI.
Nhánh `codex/c-sprint1-2` xuất phát từ remote main `b51733a`, chứa PR tích hợp
#4 và lab concurrency của E. Remote qua HTTPS công bố một head `main` và ref
PR #1–4. Bản nháp ERD chung ở nhánh trước đã được gỡ vì A có
[ERD tổng hợp](../architecture/erd-integrated-review.md).

## Thứ tự review

| Lượt | Kiểm tra | Nơi xem |
|---|---|---|
| 1 · API và SQL | Tìm mã/tên, lọc kết hợp, quyền Nhân viên/Quản lý, biên ngày và đơn hủy. Fixture kỳ vọng 1.630.000 VND từ một đơn. | [Contract](../architecture/api-contract.md), [test HTTP](../../backend/tests-db/queries.cjs) |
| 2 · UI và mock | Tìm RAM và lọc theo bốn điều kiện. Kiểm tra kết quả rỗng và trạng thái thiếu dữ liệu tồn. Ở Doanh thu, bật dữ liệu mẫu, kỳ mặc định trả 2.550.000 VND. Đảo ngược ngày để kiểm tra lỗi. | [Frontend](../../frontend/README.md), [Playwright](../../frontend/tests/queries.spec.js) |
| 3 · Lab và báo cáo | Đối chiếu 26 sản phẩm sau lọc, 600 sản phẩm chưa từng bán và 599.942.000 VND trên hai DBMS. Xem số dòng đọc khi có và khi bỏ qua index lọc. | [Lab](../../experiments/query-processing/README.md), [báo cáo](../report/3-4-query-processing.md) |
| 4 · Rubric | Đối chiếu 8 dạng thao tác. Test UC01 minh họa delete; kịch bản xóa chứng từ nháp vẫn chờ D. | [Bảng bằng chứng](../requirements.md) |

## Lệnh demo và kiểm tra

```powershell
npm test --prefix backend
node --env-file=.env.docker backend/tests-db/queries.cjs
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
npm run build --prefix frontend
npm test --prefix frontend
node experiments/query-processing/run.cjs
```

Playwright cần Chromium hoặc `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` trỏ tới Chrome
cục bộ. Test HTTP dùng MySQL lab với migration/seed A/B, cộng fixture tồn và
bán hàng trong schema dùng một lần. Để review UI độc lập, chạy
`npm run dev --prefix frontend` rồi chọn **Dùng dữ liệu mẫu**.

**Kết quả 16/11:** Backend 11/11 test, tích hợp HTTP của C và B đều đạt,
build Vite thành công, Playwright 8/8 (5 ca UC01 và 3 ca C). Lab Query processing
đối chiếu đầy đủ kết quả hai hệ và baseline ở cả bốn biến thể chạy.

## Phụ thuộc nghiệm thu

- Đã chạy lại test UC02–03 của B và kiểm tra luồng tra cứu với migration 002.
  Đây là kiểm tra kỹ thuật trên nhánh C. Reviewer cần xác nhận kết quả.
- D/E xác nhận `inventory(product_id, quantity_on_hand)` và
  `sales_orders`/`sales_order_lines` theo [F04](../architecture/f04-erd-mien-d.md).
  Khi có migration thật, chạy lại ca tồn, doanh thu và subquery với dữ liệu tích hợp.
- A/C/D chốt kỳ doanh thu khi hủy và múi giờ `confirmed_at`. Triển khai thử theo
  phương án A của F03. Nếu đơn tháng 11 bị hủy tháng 12, báo cáo tháng 11 giảm.
- A và các miền chốt phiên dùng chung. Token nhân viên local chỉ mở tra cứu.
  Hợp đồng HTTP D/E sẽ được nhập khi các owner bàn giao.
