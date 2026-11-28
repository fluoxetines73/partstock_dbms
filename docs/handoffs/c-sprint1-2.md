# Bàn giao Sprint 1–2 · C — Khánh

## Cập nhật 28/11/2026 · Bản tích hợp

Nhánh `codex/c-final-verification` lấy từ `origin/main` tại `d8f6737`.
[Review của A ngày 24/11](https://github.com/fluoxetines73/partstock_dbms/blob/c9052a9e72e0b3a5679199475bd72a0d15211800/docs/reviews/a-review-c-query-2026-11-24.md)
yêu cầu ghi rõ kỳ doanh thu khi chỉnh ngày, sửa mô tả quyền Nhân viên và cập nhật
bằng chứng aggregate. Bản sửa hiển thị kỳ theo phản hồi, bổ sung hai ca trình
duyệt và đối chiếu lại [API](../architecture/api-contract.md) cùng
[tám dạng thao tác](../requirements.md#theo-dõi-8-dạng-thao-tác).

Đối chiếu đề gốc bổ sung kết luận theo bối cảnh vào chương 3.4 và dùng lọc
trạng thái phiếu nhập làm dẫn chứng truy vấn một điều kiện.

### Chạy lại

Từ gốc repo, dùng dependency theo lockfile và cấu hình Docker lab đã chuẩn bị.
Cấu hình Chromium theo [frontend README](../../frontend/README.md#kiểm-thử-thật-qua-trình-duyệt--http--mysql-lab).
Chạy tuần tự các bộ dùng MySQL lab. Suite tự tạo và dọn schema thử riêng.

```powershell
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait mysql-lab mongo-lab
npm test --prefix backend
node --env-file=.env.docker backend/tests-db/catalog.cjs
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
node --env-file=.env.docker backend/tests-db/queries.cjs
node --env-file=.env.docker backend/tests-db/uc04-07-08.cjs
npm run build --prefix frontend
npm test --prefix frontend
node experiments/query-processing/run.cjs
```

| Kiểm tra | Kết quả 28/11 |
|---|---|
| Backend và HTTP/MySQL | 11/11 unit test và cả bốn suite HTTP đạt. Suite C kiểm tra biên kỳ, hủy khác kỳ và lọc kết hợp; suite D xác nhận UC06/11 đọc đúng tồn và doanh thu từ chứng từ tạo qua API. |
| Frontend | Build đạt. Lượt Playwright đầu có một ca UC04 chờ phản hồi xác nhận phiếu nháp rỗng đến hết thời gian chờ, 18/19 đạt. Lượt chạy lại riêng đạt 19/19, gồm 5/5 ca C. Hai ca mới kiểm tra đổi kỳ ở dữ liệu mẫu và doanh thu 840.000 VND kỳ 05/11–trước 06/11 qua MySQL lab. |
| Lab Query processing | MySQL 8.4.13, MongoDB 8.0.34 rs0. Cả bốn biến thể khớp baseline và SHA-256 của kết quả lưu. Lọc có/bỏ index đều trả 26 sản phẩm, chưa từng bán trả 600, doanh thu 599.942.000 VND. |

Lượt kiểm tra trước PR đạt 11/11 unit test, bốn suite HTTP/MySQL, build Vite và
19/19 ca Playwright. Suite D xác nhận bộ lọc trạng thái chỉ trả hai phiếu đã
xác nhận khi có thêm một phiếu nháp. Lượt lab với `--raw` khớp hash cả bốn
biến thể và xác nhận đường truy cập cùng lượng bản ghi xét ở cả ba mẫu của
từng biến thể lọc trên cả hai hệ.

### Đối chiếu gói B

- C rà kỹ thuật UC02–03. Suite HTTP và bốn ca trình duyệt B đạt. Sau khi ngừng
  kinh doanh, hàng vẫn có trong danh sách quản lý, biến mất khỏi tra cứu, bị chặn
  khi thêm hoặc xác nhận trên chứng từ mới/nháp, và vẫn hoàn tồn khi hủy đơn cũ.
  Các ca giao nhau với D nằm trong [test chứng từ](../../backend/tests-db/uc04-07-08.cjs).
- C chạy lại Lab Indexing ở chế độ query plan, `--index-size` và
  `--update-cost`. Cả ba runner hoàn tất kiểm tra trên hai hệ.
  [Cách tái chạy](../../experiments/indexing/README.md)
- UC03 hiện lưu liên hệ có thể xóa bằng `null` qua PATCH. Vòng đời nhà cung cấp
  và xử lý phiếu nhập tham chiếu tiếp tục chờ A/B/D chốt Q01.
  [Hợp đồng API](../architecture/api-contract.md#uc03--nhà-cung-cấp) · [Q01](../../agent/decisions.md#q01-nha-cung-cap)

### Demo phần C

1. Chạy `npm run dev --prefix frontend`. Mở **Tra cứu**, bật **Dùng dữ liệu mẫu**,
   lọc RAM, Kingston, giá 800.000–900.000 và **Còn hàng**. Kết quả là `RAM-001`.
   Thêm từ khóa không khớp để kiểm tra kết quả rỗng.
2. Mở **Doanh thu** và bật dữ liệu mẫu. Chạy từ 01/11/2026 đến trước
   01/12/2026 để thấy 2.550.000 VND. Đổi ô ngày thành 01/12/2026 đến trước
   01/01/2027. Kỳ bên cạnh số tiền vẫn là kỳ tháng 11. Bấm **Xem báo cáo**
   để nhận kỳ tháng 12 và 0 VND.
3. Khi demo cùng A/B/D, dùng chế độ thật. Sau phiếu nhập thì tồn tăng, sau
   bán thì tồn giảm và doanh thu dùng giá chốt của đơn. Sau hủy, tồn hoàn lại
   và báo cáo kỳ gốc giảm theo phương án đang chạy.
   [Kịch bản tích hợp](../report/demo-tich-hop.md)
4. Trong **Nhập kho**, tạo một phiếu nháp rồi chọn bộ lọc **Đã xác nhận**.
   Phiếu nháp biến mất và các phiếu đã xác nhận vẫn hiển thị. SQL dùng
   `WHERE r.status = ?`. [Ca HTTP](../../backend/tests-db/uc04-07-08.cjs#L254)
5. Trên app demo đang chạy ở cổng 3000, dùng PowerShell 7 để kiểm tra subquery.
   Thay `RAM-DEMO-01` bằng SKU bạn vừa tạo. Kết quả có SKU khi sản phẩm chưa có
   đơn xác nhận. Sau khi xác nhận bán SKU đó, gọi lại để thấy `items: []`.
   Sau khi hủy đơn, SKU vẫn bị loại vì truy vấn xem cả đơn đã xác nhận và đã hủy.
   [SQL truy vấn](../../backend/src/queries.ts) · [Test HTTP](../../backend/tests-db/queries.cjs)

   ```powershell
   $demoToken = Read-Host 'Mã truy cập app demo' -MaskInput
   $uri = 'http://127.0.0.1:3000/api/product-search?q=RAM-DEMO-01&never_sold=true'
   Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $demoToken" } | ConvertTo-Json -Depth 5
   Remove-Variable demoToken
   ```

6. Chạy `node experiments/query-processing/run.cjs` từ repo. Trong JSON, mở
   `evidence.filter` và `evidence.filter_scan`, lấy mẫu đầu trong `mysql` và
   `mongodb`. Chỉ ra MySQL đổi từ range scan `qp_filter` (40 dòng) sang
   quét theo khóa chính (2.400 dòng), MongoDB đổi từ `IXSCAN`/`FETCH`
   (40 document) sang `COLLSCAN` (2.400 document). Cả hai kế hoạch trả 26
   sản phẩm. Sau đó mở `never_sold` để giải thích antijoin và `$lookup`,
   rồi mở `revenue` để giải thích join dòng bán và dòng nhúng.
   [Chương 3.4](../report/3-4-query-processing.md)

A kiểm lại phần sửa. A/C/D còn chốt việc hủy khác kỳ và A ghép chương 3.4 vào PDF.
[Sổ quyết định](../../agent/decisions.md#uc11-sau-hủy-khác-kỳ--28112026)

Bản tích hợp có 10/12 use case theo kế hoạch. UC09 và UC12 còn ở lab, còn UC10
đã có UI/API sau PR #14. Repo có bản thảo, kịch bản demo và bằng chứng cho năm
lab, chưa thấy PDF, ZIP cuối hay biên bản ngoài file mẫu. A hoàn tất bản nộp,
E kiểm tra ZIP độc lập theo [kế hoạch](../plan.md#6-hoàn-thiện-và-nộp-bài).

## Bàn giao lần đầu · 16/11/2026

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
