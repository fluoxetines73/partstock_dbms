# UC10 · Bàn giao từ Đạt cho Hải và Tuấn

Ngày 24/11/2026, theo main tại `aeb2ddc`. Đạt ưu tiên đưa UC10 từ lab vào ứng dụng. Các mục dưới đây là phương án để Hải và Tuấn phản hồi trước khi sửa schema dùng chung. Hải phụ trách migration, API, UI và test của UC10. Tuấn đối chiếu với cách tạo linh kiện và dòng tồn trong UC02. Đạt cập nhật ERD theo migration thực tế và chạy nghiệm thu tích hợp.

## Hai điểm cần xác nhận

1. **Hải và Tuấn:** dùng `inventory.low_threshold` cho từng linh kiện, cùng vị trí với lab của Hải. Dùng số nguyên từ 0 trở lên, cho phép NULL khi chưa cấu hình. Khi nâng cấp, sản phẩm hiện có giữ số lượng và nhận ngưỡng NULL. Sản phẩm tạo mới vẫn có đúng một dòng tồn. Migration ứng dụng chỉ cần thay đổi phục vụ UC10; file schema của lab còn có cả cấu trúc kiểm kê UC12. Khi thêm cột vào migration app, kiểm tra lại phần ALTER trong runner lab để tránh thêm cột hai lần.
2. **Hải và Đạt:** Nhân viên và Quản lý được xem cảnh báo theo F02. Đề xuất chỉ Quản lý được đặt, đổi hoặc bỏ ngưỡng. Backend kiểm quyền ghi. Đổi ngưỡng giữ nguyên số lượng tồn, chứng từ và sổ biến động.

[Sơ đồ hiện tại](../architecture/erd-integrated-review.md) · [Đặc tả UC10 và Q05](../architecture/use-cases.md#uc10) · [Schema thử của Hải](../../experiments/concurrency/mysql/stock-ucs-schema.sql) · [Truy vấn của Hải](../../experiments/concurrency/mysql/stock-operations.cjs)

## Ca nghiệm thu trên ứng dụng

Trên schema MySQL lab dùng cho kiểm thử tích hợp, tạo một SKU, xác nhận phiếu nhập 9 chiếc qua API chứng từ. Mở màn hình cảnh báo ở chế độ dữ liệu thật. Sau mỗi thao tác dưới đây, tải lại danh sách.

| Thao tác | Kết quả cần thấy |
|---|---|
| Chưa đặt ngưỡng | SKU có trạng thái chưa cấu hình, không bị tính là thiếu hàng. Phân biệt được với trường hợp đã cấu hình và đủ hàng. |
| Quản lý đặt ngưỡng 9 khi tồn là 9 | SKU nằm ngoài danh sách cảnh báo. |
| Nhân viên xác nhận bán 1 chiếc | Tồn còn 8. Danh sách có đúng SKU này trong fixture một SKU, hiển thị tồn 8 và ngưỡng 9. |
| Quản lý hủy đơn rồi gửi lại yêu cầu hủy | Tồn về 9 đúng một lần. Cảnh báo biến mất. Danh sách rỗng có thông báo. |
| Đặt ngưỡng 0, thử ngưỡng âm và bỏ ngưỡng | Chấp nhận 0, từ chối giá trị âm và giữ giá trị trước đó. Bỏ ngưỡng đưa SKU về trạng thái chưa cấu hình. |
| Nhân viên thử đổi ngưỡng | API trả 403, ngưỡng cũ được giữ. Nhân viên vẫn xem được danh sách. |

Khi bàn giao lại cho Đạt, Hải ghi commit, đường dẫn migration/API/UI, lệnh test và kết quả của lượt chạy. Đạt đối chiếu luồng nhập–bán–hủy cùng quyền trên bản tích hợp; chỉ khi đó mới tính UC10 vào số use case đã có UI/API/MySQL.
