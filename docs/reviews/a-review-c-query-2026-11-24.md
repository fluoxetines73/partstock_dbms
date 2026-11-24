# Review gói C của Khánh trên main · 24/11/2026

Bản được kiểm tra là `4e3e609`, sau PR #11. UC05, UC06 và lab Query processing đạt các ca đã chạy. API UC11 đạt theo phương án A của F03. Đề nghị Khánh sửa cách hiển thị kỳ báo cáo, bổ sung kiểm thử giao diện và sửa mô tả quyền trước khi đóng gói C.

## Hai điểm cần xử lý

1. **UC11 có thể khiến người xem đọc nhầm kỳ doanh thu.** Mục 4 của [đặc tả UC11](../architecture/use-cases.md#uc11--báo-cáo-doanh-thu-theo-thời-gian) yêu cầu hiển thị kỳ áp dụng. Trên Chromium, mở Doanh thu, bật dữ liệu mẫu và xem tháng 11. Sửa hai ô ngày thành 01/12/2026 và 01/01/2027. Màn hình vẫn hiện 2.550.000 ₫ và “1 đơn đã xác nhận trong khoảng đã chọn”. Bấm Xem báo cáo mới thấy 0 ₫. [Vùng kết quả](../../frontend/src/QueryPage.jsx#L113) chỉ hiển thị tổng và số đơn. Nhờ Khánh ghi rõ kỳ của kết quả từ `response.from` và `response.to`, gồm cả ý nghĩa ngày cuối loại trừ. Thêm một ca Playwright đổi kỳ sau lần xem đầu để kiểm tra số tiền luôn đi cùng kỳ đã truy vấn.
2. **Hợp đồng API ghi thiếu quyền Nhân viên.** [Dòng 69](../architecture/api-contract.md#L69) ghi mã nhân viên chỉ mở UC05–06. Phần ngay sau và test chứng từ xác nhận nhân viên còn được nhập và bán hàng (UC04/07). Nhờ Khánh giới hạn phát biểu đó vào nhóm API truy vấn và đối chiếu lại bảng quyền chung.

**Điểm cần A/C/D chốt.** API đang cộng các đơn hiện còn CONFIRMED theo ngày xác nhận. Theo cách tính này, hủy đơn tháng 11 vào tháng 12 làm giảm doanh thu báo cáo tháng 11 khi xem lại. Kết quả kỹ thuật xác nhận cách triển khai hiện tại. Quyết định nghiệp vụ và ví dụ hủy khác kỳ cần được nhóm ghi vào sổ quyết định.

## Bằng chứng tái chạy

| Kiểm tra | Kết quả quan sát |
|---|---|
| Backend, HTTP và MySQL lab | 11/11 unit test. Suite C đạt tra SKU/tên, kết hợp loại–hãng–giá–tồn, never_sold, quyền, biên ngày, kỳ rỗng và phản hồi khi thiếu bảng. Fixture tháng 11 cho 1 đơn, 1.630.000 VND. |
| Tích hợp B/D với C | Suite B đạt. Suite D đạt nhập, bán, hủy, chống hoàn tồn lặp và đối chiếu API tồn/doanh thu với bảng do giao dịch thật ghi. |
| Frontend | Build đạt. Chromium chạy 16/16 ca, gồm tra cứu thật trên MySQL, lọc dùng dữ liệu mẫu và báo cáo dùng dữ liệu mẫu. UC11 qua HTTP đã kiểm trên bảng thật. Ca đổi kỳ nêu trên được thử thêm ngoài bộ test. |
| Lab Query processing | MySQL 8.4.13 và MongoDB 8.0.34, 2.400 sản phẩm và 4.800 đơn. Hai hệ cùng khớp baseline ở bốn biến thể. Lọc có và bỏ qua chỉ mục cùng trả 26 sản phẩm, có 600 sản phẩm chưa từng bán, doanh thu là 599.942.000 VND. Mỗi biến thể có 1 lượt làm nóng và 3 mẫu đo. |
| Rubric | [Bảng tám thao tác](../requirements.md#theo-dõi-8-dạng-thao-tác) có ví dụ cho đủ tám dạng. Dòng aggregate còn ghi chờ dữ liệu D dù suite tích hợp của D đã kiểm tổng doanh thu từ chứng từ. Nhờ Khánh cập nhật dẫn chứng khi sửa tài liệu. |

Lệnh đã dùng từ gốc repo với hai dịch vụ lab đang healthy, MongoDB rs0 PRIMARY và Chromium local được cấu hình cho Playwright.

```sh
npm test --prefix backend
node --env-file=.env.docker backend/tests-db/queries.cjs
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
node --env-file=.env.docker backend/tests-db/uc04-07-08.cjs
npm run build --prefix frontend
npm test --prefix frontend
node experiments/query-processing/run.cjs
```

Khánh có thể gửi lại commit sửa UI, ca Playwright và hợp đồng API để A kiểm lại phần còn mở.
