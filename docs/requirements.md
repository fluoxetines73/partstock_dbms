# Yêu cầu và bằng chứng

## Phạm vi và sản phẩm

Một cửa hàng, một kho linh kiện; nhân viên/quản lý nội bộ. Luồng: linh kiện → nhập → bán → tồn → báo cáo.
Không gồm cửa hàng online, thanh toán trực tuyến, giao hàng, nhiều chi nhánh, bảo hành,
hóa đơn điện tử hay hệ phân tán phức tạp. MySQL chạy ứng dụng; MongoDB cho thực nghiệm.
Ít nhất 10 use case nghiệp vụ cho 5 người, dự kiến 12 bên dưới; login/logout/quên mật khẩu không tính.
Sơ đồ use case ở nhánh F02 chờ tích hợp. Bản đầu backend UC01 và bằng chứng kiểm tra
ở nhánh `docs/a-sprint1-foundation`; chưa nghiệm thu app/demo đầy đủ.

| ID | Chức năng | Owner | Trạng thái / bằng chứng |
|---|---|---|---|
| UC01 | Quản lý danh mục và thương hiệu | A | Đang làm: API/schema, 11 test và kiểm tra lab đạt; còn UI/phân quyền/tích hợp/review — [bằng chứng](../backend/README.md) |
| UC02 | Quản lý linh kiện, thông số, giá bán | B | Chưa triển khai / chưa có |
| UC03 | Quản lý nhà cung cấp | B | Chưa triển khai / chưa có |
| UC04 | Tạo/xác nhận phiếu nhập và tăng tồn kho | D | Chưa triển khai / chưa có |
| UC05 | Tra cứu sản phẩm theo mã/tên | C | Chưa triển khai / chưa có |
| UC06 | Lọc sản phẩm theo loại, hãng, giá, tồn kho | C | Chưa triển khai / chưa có |
| UC07 | Tạo/xác nhận đơn bán và trừ tồn kho | D | Chưa triển khai / chưa có |
| UC08 | Hủy đơn theo quy tắc và hoàn tồn kho | D | Chưa triển khai / chưa có |
| UC09 | Tra cứu lịch sử nhập/xuất/tồn | E | Chưa triển khai / chưa có |
| UC10 | Cảnh báo tồn kho dưới ngưỡng | E | Chưa triển khai / chưa có |
| UC11 | Báo cáo doanh thu theo thời gian | C | Chưa triển khai / chưa có |
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

Các ví dụ dưới đây là kịch bản dự kiến, chưa phải bằng chứng đạt. C điều phối đối chiếu;
owner bổ sung đường dẫn code, script/query, dữ liệu đầu vào, kết quả và demo thực tế.

| Dạng | Kịch bản dự kiến | Owner | Code/script/demo | Trạng thái |
|---|---|---|---|---|
| insert | Thêm sản phẩm/nhà cung cấp | B | Chưa có | Chưa triển khai |
| delete | Xóa chứng từ nháp chưa ảnh hưởng kho | D | Chưa có | Chưa triển khai |
| update | Đổi giá/thông số sản phẩm | B | Chưa có | Chưa triển khai |
| Điều kiện đơn | Tra cứu mã sản phẩm | C | Chưa có | Chưa triển khai |
| Điều kiện kết hợp | Loại + hãng + giá + tồn | C | Chưa có | Chưa triển khai |
| join | Đơn bán, dòng bán và sản phẩm | D / C | Chưa có | Chưa triển khai |
| subquery | Sản phẩm chưa từng bán, theo schema chốt | C | Chưa có | Chưa triển khai |
| aggregate | Doanh thu theo thời gian | C | Chưa có | Chưa triển khai |

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
