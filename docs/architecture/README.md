# Kiến trúc dự kiến

[API contract A/B/C](api-contract.md) ghi các route đã có và phần tích hợp
còn chờ D/E. ERD tích hợp tiếp tục theo bản review của A.

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

## Bản nháp miền A — 11/11/2026

[Thiết kế UC01](uc01-catalog-brand-design.md) gồm dữ liệu danh mục/thương hiệu,
API, phụ thuộc B/C và ca nghiệm thu. Đã có migration/API/UI UC01, 11 test backend,
5 test trình duyệt và kiểm tra FK sản phẩm thật đạt; còn review nhóm/phân quyền chung.
Tiến độ thực hiện nền A: [todo Sprint 1](../tasks/a-sprint1-todo.md).

[ERD miền A](erd-mien-a.md): danh mục, thương hiệu và liên kết dự kiến với sản phẩm của B;
bản nháp để review và ghép ERD chung.

[Đề xuất khung backend](backend-foundation.md): công cụ, cấu trúc và kiểm tra kết nối tối thiểu.

## Bản nháp miền B — 13/11/2026

[erd-mien-b.md](erd-mien-b.md) mô tả linh kiện, nhà cung cấp và hai liên kết với UC01.
Bản nháp chờ C review và A ghép ERD chung. Migration 002 tạo bảng linh kiện và nhà cung cấp.
Hướng dẫn nạp seed nằm trong [database/seed/README.md](../../database/seed/README.md#dữ-liệu-mẫu-uc0203).

Bản nháp thiết kế đang chờ review (chưa chốt). Từ 17/11/2026 đã có migration 003, API, UI và lab Transaction cài đặt theo hai bản nháp này
(xem [bàn giao D](../handoffs/d-sprint2.md)); các điểm lệch so với nháp ghi ở đó:

- [F03 — Quy tắc chứng từ, hủy/doanh thu và cập nhật kho](f03-quy-tac-chung-tu-kho.md) — D soạn, chờ E/C/A.
- [F04 — ERD và từ điển dữ liệu miền D](f04-erd-mien-d.md) — phiếu nhập, đơn bán, tồn và biến động kho; chờ E/C, A hợp nhất.

## Bản ghép review — 16/11/2026

[ERD tổng hợp](erd-integrated-review.md) đối chiếu A/B với nháp Nam, ghi rõ phần đã có
migration và phần còn chờ Hải/Khánh. F02 và F03/F04 được ghép giữ lịch sử trên nhánh
`integration/a-sprint2-review`; chưa vào main hoặc thành quyết định nhóm.
[Bàn giao nghiệm thu](../handoffs/a-acceptance-2026-11-16.md) ghi reviewer và đầu vào còn thiếu.
