# Kiến trúc dự kiến

Đã có [bản nháp F02: 12 use case](use-cases.md), [sơ đồ](use-case-diagram.svg)
và [nguồn Graphviz](use-case-diagram.dot), ngày 10/11/2026; chờ C review và owner góp ý.
Xem [bàn giao và kiểm tra F02](f02-handoff.md). A đã duyệt hai actor Nhân viên/Quản lý ngày 10/11/2026; chưa nghiệm thu F02 hoặc triển khai phân quyền.
Chưa có ERD MySQL, model MongoDB và hợp đồng API đã chốt; bổ sung sau review,
kèm ngày/phiên bản và liên kết quyết định.

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
