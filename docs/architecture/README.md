# Kiến trúc dự kiến

Chưa có sơ đồ/schema/API đã chốt. Cần lưu sơ đồ use case (12 UC), ERD MySQL,
model MongoDB và hợp đồng API sau khi nhóm review, kèm ngày/phiên bản và liên kết quyết định.

Luồng ứng dụng dự kiến: React/Vite → Express/TypeScript → MySQL app.
Luồng thực nghiệm riêng: script lab → MySQL lab hoặc MongoDB lab; không đồng bộ app–MongoDB.
Schema/API chung là điểm phụ thuộc; seed/mock theo hợp đồng cho phép phát triển song song.
D–E thiết kế chung giao dịch cập nhật chứng từ, tồn, biến động và xử lý cạnh tranh/lỗi.
Nháp không đổi kho; trạng thái được hủy và doanh thu sau hủy chưa chốt.
B thiết kế môi trường tách kết nối/cấu hình/quyền app/lab; A kiểm tra cả nhóm chạy được.
Hiện có [cấu hình Docker local](../../setup-local-docker.md) với hai MySQL app/lab riêng và
MongoDB lab rs0 một node, tách credential/network/volume; đã kiểm chứng trên một máy,
chờ review và tái tạo trên máy khác. Đây chưa là schema/API hoặc kiến trúc app được duyệt.
Xem [quyết định](../../agent/decisions.md) và [yêu cầu](../requirements.md).

## Bản nháp miền A — 11/11/2026

[Thiết kế UC01](uc01-catalog-brand-design.md) gồm dữ liệu danh mục/thương hiệu,
API, phụ thuộc B/C và ca nghiệm thu. Đã có migration/code UC01, 11 test và kiểm tra lab đạt;
còn review nhóm, UI, phân quyền chung và FK sản phẩm thật.
Tiến độ thực hiện nền A: [todo Sprint 1](../tasks/a-sprint1-todo.md).

[ERD miền A](erd-mien-a.md): danh mục, thương hiệu và liên kết dự kiến với sản phẩm của B;
bản nháp để review và ghép ERD chung.

[Đề xuất khung backend](backend-foundation.md): công cụ, cấu trúc và kiểm tra kết nối tối thiểu.
