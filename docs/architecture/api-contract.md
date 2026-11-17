# API PartStock — hợp nhất để review

C cập nhật 16/11/2026, A review. API dùng JSON, Bearer token local và ID là
chuỗi số dương. Chi tiết A/B xem [backend README](../../backend/README.md).

| UC | Endpoint hiện có | Quyền local |
|---|---|---|
| UC01 | `GET/POST /api/categories`, `GET/POST /api/brands`, `PATCH/DELETE` trên từng ID. Body tạo/sửa `{name}`. | Quản lý |
| UC02 | `GET/POST /api/products`, `PATCH /api/products/:id`. Trường SKU, tên, ID danh mục/thương hiệu, thông số và giá nguyên VND. | Quản lý |
| UC03 | `GET/POST /api/suppliers`, `PATCH /api/suppliers/:id`. Trường tên, điện thoại, email. | Quản lý |
| UC05–06 | `GET /api/product-search`, `GET /api/product-search/facets`. | Nhân viên, Quản lý |
| UC11 | `GET /api/revenue?from=2026-11-01&to=2026-12-01`. | Quản lý |

Route HTTP của UC04/07/08 chờ D bàn giao theo [F03/F04](f03-quy-tac-chung-tu-kho.md).
UC09/10/12 có [kịch bản lab E](../../experiments/concurrency/README.md); hợp đồng
HTTP chờ E bàn giao. A và các miền cần thống nhất phiên dùng chung.

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

`APP_STAFF_TOKEN` chỉ mở UC05–06. Quản lý dùng `APP_MANAGER_TOKEN` hiện tại.
Đặt hai giá trị khác nhau trong `.env.docker` local, rồi khởi động lại backend.
