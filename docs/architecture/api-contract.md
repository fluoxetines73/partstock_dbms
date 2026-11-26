# API PartStock — hợp nhất để review

C cập nhật 16/11/2026, A review. API dùng JSON, Bearer token local và ID là
chuỗi số dương. Chi tiết A/B xem [backend README](../../backend/README.md).

| UC | Endpoint hiện có | Quyền local |
|---|---|---|
| UC01 | `GET/POST /api/categories`, `GET/POST /api/brands`, `PATCH/DELETE` trên từng ID. Body tạo/sửa `{name}`. | Quản lý |
| UC02 | `GET/POST /api/products`, `PATCH /api/products/:id`. Trường SKU, tên, ID danh mục/thương hiệu, thông số và giá nguyên VND. | Quản lý |
| UC03 | `GET/POST /api/suppliers`, `PATCH /api/suppliers/:id`. Trường tên, điện thoại, email. | Quản lý |
| UC04 | `GET/POST /api/purchase-receipts`, `GET/PUT/DELETE /api/purchase-receipts/:id`, `POST /api/purchase-receipts/:id/confirm`, `GET /api/purchase-receipts/suppliers`. | Nhân viên, Quản lý |
| UC07 | `GET/POST /api/sales-orders`, `GET/PUT/DELETE /api/sales-orders/:id`, `POST /api/sales-orders/:id/confirm`. | Nhân viên, Quản lý |
| UC08 | `POST /api/sales-orders/:id/cancel` với `{reason}`. | Quản lý |
| UC05–06 | `GET /api/product-search`, `GET /api/product-search/facets`. | Nhân viên, Quản lý |
| UC10 | `GET /api/stock-alerts` · `PUT /api/products/:id/low-threshold` | Nhân viên và Quản lý xem; Quản lý ghi |
| UC11 | `GET /api/revenue?from=2026-11-01&to=2026-12-01`. | Quản lý |

UC04/07/08 theo [F03/F04](f03-quy-tac-chung-tu-kho.md), chi tiết ở mục dưới.
UC09/12 có [kịch bản lab E](../../experiments/concurrency/README.md); hợp đồng
HTTP chờ E bàn giao. A và các miền cần thống nhất phiên dùng chung.

## UC02 · Ngừng kinh doanh linh kiện

Quản lý gửi `PATCH /api/products/:id` với `{"status":"DISCONTINUED"}`. API trả `200` kèm
bản ghi đã cập nhật, kể cả khi gửi lặp. `POST /api/products` dùng mặc định `ACTIVE` và chỉ
`PATCH` chấp nhận trường `status` với giá trị `DISCONTINUED`.

Linh kiện vẫn có trong `GET /api/products` và chứng từ cũ. Thao tác giữ nguyên tồn kho và
sổ biến động. UC04/07 từ chối thêm hoặc xác nhận nháp chứa linh kiện này. UC08 vẫn cho
hủy đơn đã xác nhận và hoàn tồn theo luồng hiện có.

## UC05–06 · Tra cứu

`q` được trim và chuẩn hóa NFC. So SKU chính xác hoặc tìm chuỗi con theo tên
dựa trên collation của migration 002. Từ khóa rỗng bỏ điều kiện tìm. Chỉ trả
sản phẩm ACTIVE. Kết hợp AND với `category_id`, `brand_id`, khoảng giá
bao gồm hai biên `min_price`/`max_price` (số nguyên VND 0–999999999999999)
và `stock=in` (dương) hoặc `stock=out` (0).
`limit` mặc định 25, tối đa 100. `offset` mặc định 0. Sắp theo ID số tăng dần.
`never_sold=true` là bộ lọc API để demo subquery: chỉ lấy sản phẩm chưa từng có
dòng thuộc đơn đã xác nhận, kể cả đơn đã hủy sau đó. Bộ lọc cần bảng bán hàng
của D, giống báo cáo doanh thu.

```json
{"items":[{"id":"1","sku":"RAM-KIN-08","name":"Kingston DDR4 8GB","category_id":"1","category_name":"RAM","brand_id":"1","brand_name":"Kingston","selling_price_vnd":"420000","quantity_on_hand":3}],"stock_available":true,"has_more":false}
```

Facets trả `{categories:[{id,name}],brands:[{id,name}]}`. Nếu chưa có
`inventory`, tra cứu vẫn trả danh sách với tồn `null` và `stock_available: false`.
Lọc tồn trả 503 `STOCK_UNAVAILABLE` trong trường hợp này. Nếu có bảng nhưng
thiếu dòng tồn của một sản phẩm, tồn của sản phẩm đó là `null`.

## UC11 · Doanh thu

`from` và `to` là ngày lịch `YYYY-MM-DD` với `from < to`. Đề xuất ghi
`confirmed_at` theo giờ Việt Nam như F03 và truy vấn biên `[from, to)`.
Triển khai thử dùng phương án A của F03: cộng `quantity × unit_price` của đơn
đang CONFIRMED, nên hủy làm thay đổi doanh thu kỳ gốc. A/C/D cần xác nhận
trước nghiệm thu. Tổng tiền và đếm đơn là chuỗi. Kỳ rỗng trả `"0"` cho cả hai.

```json
{"from":"2026-11-01","to":"2026-12-01","revenue_vnd":"1630000","order_count":"1"}
```

Lỗi trả `{error:{code,message}}`. 400 nếu tham số sai, 401 thiếu mã truy cập,
403 mã sai hoặc thiếu quyền, 503 `AUTH_NOT_CONFIGURED` nếu chưa có mã được cấu
hình. Thiếu bảng/cột phụ thuộc trả 503 `QUERY_SCHEMA_UNAVAILABLE` và lỗi truy
vấn khác trả 500 `QUERY_FAILED`. Phản hồi không chứa lỗi SQL.

Trong nhóm API truy vấn, `APP_STAFF_TOKEN` mở UC05–06 và xem cảnh báo UC10. Quản lý dùng `APP_MANAGER_TOKEN` hiện tại.
Đặt hai giá trị khác nhau trong `.env.docker` local, rồi khởi động lại backend.

## UC04 · UC07 · UC08 · Phiếu nhập, đơn bán, hủy

D cập nhật 17/11/2026. Cùng Bearer token và ID chuỗi số như các UC khác. Nhân viên (`APP_STAFF_TOKEN`)
và Quản lý đều dùng được UC04/07; chỉ Quản lý hủy đơn. Mã chứng từ do server sinh:
`PN-YYYYMMDD-NNNNNN` (phiếu nhập), `DB-YYYYMMDD-NNNNNN` (đơn bán), ngày theo giờ Việt Nam.

**Nháp.** `POST` tạo nháp, `PUT /:id` thay toàn bộ nhà cung cấp/khách, ghi chú và danh sách dòng của nháp,
`DELETE /:id` xóa nháp cùng dòng. Nháp không đổi tồn và có thể rỗng. Body:

```json
{"supplier_id":"1","note":"Hàng về sáng","lines":[{"product_id":"1","quantity":5,"unit_cost":360000}]}
{"customer_name":"Khách lẻ","note":null,"lines":[{"product_id":"1","quantity":3}]}
```

`quantity` là số nguyên 1–1.000.000, `unit_cost` là số nguyên VND ≥ 0, tối đa 100 dòng, mỗi sản phẩm một dòng.
Sản phẩm ngừng kinh doanh không được thêm vào nháp. Dòng đơn bán trong nháp mang giá bán hiện hành chỉ để hiển thị.

**Xác nhận.** `POST /:id/confirm` chạy một transaction: đổi trạng thái có điều kiện `DRAFT → CONFIRMED`, rồi theo
`product_id` tăng dần cập nhật tồn và ghi biến động `IMPORT`/`SALE`. Đơn bán chốt `unit_price` từ giá hiện hành của sản phẩm
và trừ tồn bằng câu `UPDATE ... WHERE quantity_on_hand >= q`. Thiếu tồn ở bất kỳ dòng nào thì cả đơn quay lại.

**Hủy.** `POST /:id/cancel` với `{"reason":"..."}` (bắt buộc, tối đa 500 ký tự): `CONFIRMED → CANCELLED`, hoàn đủ mọi dòng và ghi
`SALE_CANCEL`. Sản phẩm đã ngừng kinh doanh vẫn được hoàn. Không hủy một phần. Quy tắc hủy, hạn hủy và doanh thu sau hủy là đề xuất
F03, chưa được nhóm chốt.

Phản hồi chi tiết gồm `id, code, status, note, created_at, confirmed_at, line_count`, tổng tiền dạng chuỗi
(`total_cost_vnd` / `total_vnd`) và `lines`. Đơn bán thêm `customer_name, cancelled_at, cancel_reason`.
Danh sách nhận `status`, `limit` (mặc định 50, tối đa 200) và `offset`, sắp theo ID giảm dần.

| HTTP | Mã lỗi | Trường hợp |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body, ID, trùng sản phẩm, số lượng hoặc giá không hợp lệ; thiếu lý do hủy |
| 400 | `INVALID_REFERENCE` | Nhà cung cấp hoặc sản phẩm không tồn tại |
| 403 | `FORBIDDEN` | Mã sai, hoặc Nhân viên gọi hủy đơn |
| 404 | `NOT_FOUND` | Chứng từ không tồn tại |
| 409 | `RECEIPT_NOT_DRAFT` / `ORDER_NOT_DRAFT` | Sửa, xóa hoặc xác nhận chứng từ không còn là nháp; kèm `status` hiện tại. Gửi lại xác nhận cho kết quả này |
| 409 | `ORDER_NOT_CANCELLABLE` | Hủy đơn nháp hoặc đã hủy; kèm `status` |
| 409 | `EMPTY_DOCUMENT` | Xác nhận chứng từ không có dòng |
| 409 | `PRODUCT_DISCONTINUED` | Có sản phẩm ngừng kinh doanh; kèm `skus` |
| 409 | `INSUFFICIENT_STOCK` | Thiếu tồn; kèm `sku`, `requested`, `available` |
| 409 | `INVENTORY_MISSING` | Sản phẩm không có dòng tồn (dữ liệu sai, không nên xảy ra) |
| 503 | `TRANSACTION_RETRY` / `LOCK_TIMEOUT` | Deadlock sau 3 lần chạy lại hoặc hết thời gian chờ khóa; không có gì được lưu |
| 503 | `SCHEMA_UNAVAILABLE` | Chưa áp migration 003 |

`POST /api/products` (UC02) tạo thêm dòng tồn bằng 0 trong cùng transaction. Mốc `confirmed_at`, `cancelled_at` và
`occurred_at` của biến động lưu theo giờ Việt Nam (+07:00) không phụ thuộc múi giờ máy chủ MySQL. Tiền và tổng là chuỗi số nguyên VND.

## UC10 · Cảnh báo tồn thấp

`GET /api/stock-alerts` dành cho Nhân viên và Quản lý. Phản hồi gồm hai mảng `alerts` (tồn nhỏ hơn ngưỡng) và `unconfigured` (ngưỡng NULL). Mỗi dòng gồm `product_id` dạng chuỗi, `sku`, `name`, `quantity_on_hand` và `low_threshold`. Khi tồn bằng ngưỡng, sản phẩm không xuất hiện trong danh sách cảnh báo.

Quản lý gửi `PUT /api/products/:id/low-threshold` với JSON `{"low_threshold":9}` để đặt ngưỡng hoặc `{"low_threshold":null}` để bỏ ngưỡng. Giá trị hợp lệ từ 0 đến 2147483647. Khi thành công, API trả 200 cùng `product_id` và `low_threshold`. Nhân viên gửi PUT nhận 403.
