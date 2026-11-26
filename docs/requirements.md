# Yêu cầu và bằng chứng

## Phạm vi và sản phẩm

Một cửa hàng, một kho linh kiện; nhân viên/quản lý nội bộ. Luồng: linh kiện → nhập → bán → tồn → báo cáo.
Không gồm cửa hàng online, thanh toán trực tuyến, giao hàng, nhiều chi nhánh, bảo hành,
hóa đơn điện tử hay hệ phân tán phức tạp. MySQL chạy ứng dụng; MongoDB cho thực nghiệm.
Ít nhất 10 use case nghiệp vụ cho 5 người, dự kiến 12 bên dưới; login/logout/quên mật khẩu không tính.
Ngày 16/11: F02, nháp F03/F04 của Nam và code A/B đã ghép trên nhánh review
`integration/a-sprint2-review`, chưa vào main hoặc được nghiệm thu toàn nhóm.
Xem [bàn giao A](handoffs/a-acceptance-2026-11-16.md).

| ID | Chức năng | Owner | Trạng thái / bằng chứng |
|---|---|---|---|
| UC01 | Quản lý danh mục và thương hiệu | A | Sẵn sàng review UI–API–DB: 11 test backend, integration FK sản phẩm thật, 5 browser test đạt; còn phân quyền hai actor/review và nghiệm thu bản chung — [bằng chứng](report/demo-mien-a.md) |
| UC02 | Quản lý linh kiện, thông số, giá bán | B | Có UI/API xem, thêm, sửa, ngừng kinh doanh. Khi thêm, API tạo dòng tồn bằng `0` cùng giao dịch. Chờ review — [demo](report/demo-mien-b.md#1-uc0203-qua-http-trên-mysql-lab) |
| UC03 | Quản lý nhà cung cấp | B | Có UI/API xem, thêm, sửa. Còn quy tắc xóa/ngừng sử dụng và review — [demo](report/demo-mien-b.md#1-uc0203-qua-http-trên-mysql-lab) |
| UC04 | Tạo/xác nhận phiếu nhập và tăng tồn kho | D | Đã làm UI–API–MySQL, chờ review E: tạo/sửa/xóa nháp, xác nhận cộng tồn đúng một lần. [Bàn giao D](handoffs/d-sprint2.md) · [test](../backend/tests-db/uc04-07-08.cjs) |
| UC05 | Tra cứu sản phẩm theo mã/tên | C | UI/mock và API đã kiểm tra với migration A/B; chờ review A. [Bàn giao](handoffs/c-sprint1-2.md) |
| UC06 | Lọc sản phẩm theo loại, hãng, giá, tồn kho | C | UI/mock và API đã kiểm tra; phần tồn dùng fixture lab, chờ D/E. [Bàn giao](handoffs/c-sprint1-2.md) |
| UC07 | Tạo/xác nhận đơn bán và trừ tồn kho | D | Đã làm UI–API–MySQL, chờ review E: chốt giá lúc xác nhận, từ chối khi thiếu tồn, chống xác nhận lặp. [Bàn giao D](handoffs/d-sprint2.md) |
| UC08 | Hủy đơn theo quy tắc và hoàn tồn kho | D | Đã làm UI–API–MySQL, chờ review E: chỉ Quản lý, bắt buộc lý do, hoàn kho đúng một lần. Quy tắc hủy là đề xuất F03 chưa được nhóm chốt. [Bàn giao D](handoffs/d-sprint2.md) |
| UC09 | Tra cứu lịch sử nhập/xuất/tồn | E | Chưa triển khai / chưa có |
| UC10 | Cảnh báo tồn kho dưới ngưỡng | E | Có migration 004, API và UI. Nhân viên/Quản lý xem, Quản lý cấu hình. Chờ review nhóm. [Hợp đồng UC10](architecture/api-contract.md#uc10--cảnh-báo-tồn-thấp) · [Test HTTP và chứng từ](../backend/tests-db/uc04-07-08.cjs) |
| UC11 | Báo cáo doanh thu theo thời gian | C | UI/mock và API kiểm tra qua fixture lab; chờ schema D, chính sách doanh thu và review A. [Bàn giao](handoffs/c-sprint1-2.md) |
| UC12 | Kiểm kê và điều chỉnh tồn kho có lý do | E | Chưa triển khai / chưa có |

## Quy tắc nghiệp vụ

- Nháp chưa tác động tồn kho.
- Xác nhận nhập/bán/hủy/kiểm kê cập nhật chứng từ, tồn và lịch sử nhất quán.
- Không bán vượt tồn; không hoàn kho lặp cho cùng lần hủy.
- Dòng đơn lưu giá bán tại thời điểm giao dịch; sản phẩm có lịch sử thì ngừng kinh doanh.
- D–E thống nhất quy ước cập nhật tồn/ghi biến động.
- Trạng thái được hủy, doanh thu sau hủy và schema chi tiết còn mở: xem agent/decisions.md.
- Delete chỉ dùng nháp hoặc dữ liệu chưa tham chiếu; không phá lịch sử để đủ rubric.

## Theo dõi 8 dạng thao tác

C đối chiếu bằng chứng theo nguồn ghi trong từng dòng. Kịch bản còn mở cần owner
bổ sung đường dẫn code, script/query, dữ liệu đầu vào, kết quả và demo thực tế.

| Dạng | Kịch bản dự kiến | Owner | Code/script/demo | Trạng thái |
|---|---|---|---|---|
| insert | Thêm sản phẩm/nhà cung cấp | B | `POST /api/products` tạo `RAM-TEST-01` giá 450.000 VND, `POST /api/suppliers` tạo nhà cung cấp mẫu. Cả hai trả `201` và xuất hiện trong GET cuối. [Integration test](../backend/tests-db/uc02-03.cjs#L75) · [Demo](report/demo-mien-b.md#1-uc0203-qua-http-trên-mysql-lab) | Đã kiểm chứng qua HTTP → MySQL lab |
| delete | Xóa chứng từ nháp chưa ảnh hưởng kho | D | `DELETE /api/sales-orders/:id` và `DELETE /api/purchase-receipts/:id` chỉ xóa nháp (204); chứng từ đã xác nhận trả `409`. Tồn và biến động giữ nguyên. [Integration test](../backend/tests-db/uc04-07-08.cjs) · [Playwright](../frontend/tests/documents.spec.js). Xóa danh mục/thương hiệu: [test UC01](../frontend/tests/catalog.spec.js). | Đã kiểm chứng qua HTTP → MySQL lab, chờ review E |
| update | Đổi giá/thông số sản phẩm | B | `PATCH /api/products/:id` trả `200` khi đổi giá từ 450.000 lên 470.000 VND và khi xóa thông số bằng `null`. GET cuối đọc lại đúng hai giá trị. [Integration test](../backend/tests-db/uc02-03.cjs#L82) · [Demo](report/demo-mien-b.md#1-uc0203-qua-http-trên-mysql-lab) | Đã kiểm chứng qua HTTP → MySQL lab |
| Điều kiện đơn | Tra cứu mã sản phẩm | C | `GET /api/product-search?q=RAM-KIN-08` trong [test](../backend/tests-db/queries.cjs) | HTTP → MySQL lab với migration A/B |
| Điều kiện kết hợp | Loại + hãng + giá + tồn | C | `GET /api/product-search` với đủ bốn điều kiện trong [test](../backend/tests-db/queries.cjs) | HTTP → MySQL lab, tồn dùng fixture |
| join | Đơn bán, dòng bán và sản phẩm | D / C | Chi tiết đơn join dòng–sản phẩm, chi tiết phiếu join nhà cung cấp ([sales.ts](../backend/src/sales.ts), [purchases.ts](../backend/src/purchases.ts)); doanh thu join đầu đơn/dòng ([queries.ts](../backend/src/queries.ts)) đọc dữ liệu thật của D. | Đã kiểm chứng trên bảng thật; test C chạy trên migration 003 |
| subquery | Sản phẩm chưa từng bán | C | `GET /api/product-search?never_sold=true` và `NOT EXISTS` trong [lab](../experiments/query-processing/README.md) | HTTP → fixture MySQL và đối chiếu hai hệ |
| aggregate | Doanh thu theo thời gian | C | `GET /api/revenue` trả 1.630.000 VND trên [fixture app](../backend/tests-db/queries.cjs) | HTTP → fixture MySQL, chờ dữ liệu D |

## Rubric và đầu ra

| Hạng mục | Trọng số | Bằng chứng cần có |
|---|---|---|
| Cấu trúc báo cáo | 10% | PDF có bố cục, mục lục và tài liệu tham khảo |
| Nội dung | 10% | Phân tích, kết luận theo bối cảnh và trích dẫn |
| Thuyết trình | 10% | Mỗi người trình bày phần mình, diễn tập |
| Teamwork | 10% | Phân công, đóng góp, PR/review, biên bản |
| Demo DBMS | 30% | Năm chủ đề trên cả hai hệ, script và bằng chứng |
| Ứng dụng | 30% | App MySQL chạy ổn định, use case và 8 dạng thao tác |

Năm chủ đề: storage & management, indexing, query processing, transaction, concurrency control.
Mỗi người có kịch bản chạy, bằng chứng, phân tích và kết luận trên cả hai hệ.
Backup/restore trên hai hệ là bổ sung, không thay chủ đề hay bảo đảm bonus;
phân biệt với recovery nội bộ DBMS.
Nộp PDF, mã nguồn/app, script/demo hai hệ, hướng dẫn, kết quả, đóng góp và biên bản.
A nộp một ZIP ngày **30/11/2026**, giờ LMS, lưu xác nhận; slide không bắt buộc.
