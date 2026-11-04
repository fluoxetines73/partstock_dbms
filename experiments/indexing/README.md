# Indexing

## Mục tiêu và owner
Kiểm chứng cơ chế Indexing trên cả MySQL và MongoDB theo nghiệp vụ PartStock.
Owner: **B**. Trạng thái: **chưa triển khai**, chưa có script/lệnh chạy/kết quả.

## Câu hỏi cần kiểm chứng
Index thay đổi kế hoạch, số dữ liệu quét và chi phí đọc/ghi ra sao?

## Kịch bản dự kiến
- MySQL: Đo truy vấn mã sản phẩm và lọc hãng/giá trước/sau index đơn/ghép theo schema được chốt.
- MongoDB: Đo các truy vấn tương đương trước/sau index đơn/ghép trên model đã ghi rõ.

## Đầu vào
Cùng seed/phân bố và bộ truy vấn có độ chọn lọc khác nhau.
Schema/seed dùng chung ở database/; ghi model riêng và khác biệt giữa hai hệ.

## Bằng chứng cần thu
Định nghĩa index, kế hoạch, số quét/trả về, thời gian lặp, kích thước và chi phí cập nhật; giải thích tác động.
Mỗi kết quả đi kèm script, dữ liệu tái tạo, cấu hình và giải thích theo bối cảnh.

## Điều kiện so sánh
Cùng nghiệp vụ/dữ liệu logic; ghi phiên bản, topology, tài nguyên/cấu hình, quy mô, index,
cache, số lần chạy và cách tổng hợp khi đo hiệu năng. Kiểm tra hỗ trợ tính năng trước khi chạy.
Không coi một lượt đo là kết luận tổng quát; nêu khác biệt model và giới hạn.

## Reset lab
Chưa có lệnh reset. Khi triển khai: xác minh đích lab bằng cấu hình/kết nối/quyền riêng,
kết thúc các phiên thử, tạo lại dữ liệu thử từ seed đã biết và đối chiếu baseline trước lần tiếp.
Không chạy reset trên database ứng dụng; backup/dump và artifact lớn không commit.
