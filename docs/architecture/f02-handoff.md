# Bàn giao F02 — 10/11/2026

- Owner: A — Đạt. Reviewer theo kế hoạch: C — Khánh, chưa review.
- Trạng thái: đã soạn bản nháp và render hình; chờ review nghiệp vụ và tích hợp, chưa Done.
- Phạm vi: F02; bỏ qua F01 theo yêu cầu người dùng, không đánh dấu F01 hoàn thành.

## File và đầu ra

- [use-cases.md](use-cases.md): bảng đủ 12 UC, actor, đặc tả luồng/ngoại lệ/hậu điều kiện; Q00 đã được A duyệt, Q01–Q07 còn cần góp ý.
- [use-case-diagram.dot](use-case-diagram.dot): nguồn sơ đồ với actor dạng classifier UML «actor», ranh giới ứng dụng và 12 ellipse.
- [use-case-diagram.svg](use-case-diagram.svg): hình render từ nguồn Graphviz.
- [README](README.md): liên kết các tài liệu, phân biệt bản nháp và thiết kế đã chốt.
- [Kế hoạch F02](../superpowers/plans/2026-11-10-f02-use-cases.md): ghi tiến độ và điều chỉnh công cụ.

## Điều chỉnh khi thực hiện

Máy có Graphviz 16.1.0 và chưa có PlantUML. Dùng `.dot` thay `.puml` để sinh SVG
bằng công cụ đã có, giữ các thành phần UML cần cho sơ đồ v1; không cài thêm dependency.
Actor dùng classifier «actor» thay hình người. Không dùng include/extend vì đặc tả v1
chưa cần các quan hệ đó. C có thể yêu cầu đổi ký pháp/công cụ nếu yêu cầu môn cần khác.

A duyệt hai actor Nhân viên/Quản lý ngày 10/11/2026; Nhân viên thực hiện 6 UC hằng ngày, Quản lý thực hiện cả 12 UC.
Các luồng còn phụ thuộc quyết định được đánh dấu; không tự sửa sổ quyết định thành đã chốt.

## Kiểm tra thực tế

Đã chạy `dot -V`: Graphviz 16.1.0. Đã render thành công bằng:

```bash
dot -Tsvg docs/architecture/use-case-diagram.dot -o docs/architecture/use-case-diagram.svg
```

Đã đối chiếu tự động đủ 12 ID/tên/owner với requirements; Lần kiểm tra bản đầu: SVG có một actor và đủ 12 UC; bản cập nhật hai actor được kiểm tra riêng bên dưới.
Đã kiểm tra các liên kết local/anchor trong bộ tài liệu và kế hoạch, whitespace và `git diff --check`: đạt.
Đã chuyển SVG sang PNG tạm bằng `rsvg-convert` và quan sát: chữ tiếng Việt rõ,
đủ 12 UC, không bị cắt/chồng; actor ngoài ranh giới, đường nối phân biệt được.
Hình dọc dài, có thể cần bố trí lại khi đưa vào báo cáo PDF.
Review hỗ trợ độc lập phát hiện thiếu nhánh xóa nháp UC04/UC07 và nhánh xem
UC01/UC03; đã bổ sung, xóa nháp không đổi kho và từ chối xóa chứng từ đã xác nhận.
Đây là review tài liệu hỗ trợ, không phải C đã review hoặc nhóm đã nghiệm thu.
Không chạy database hoặc kiểm thử ứng dụng cho task tài liệu này.

## Việc tiếp nhận

- C review bảng/sơ đồ/đặc tả; B–E góp ý UC mình. Phần C cùng viết cần người khác review.
- F03 tiếp nhận Q03/Q06/Q07, phối hợp Q02/Q05; F04 nhận nhu cầu dữ liệu và ràng buộc.
- F13 chuyển các ngoại lệ/hậu điều kiện thành tình huống kiểm thử sau khi quy tắc được chốt.
- Q00 đã được A duyệt; C/owner review cách áp dụng. Q01 về dữ liệu tham chiếu và Q04 về tìm/lọc còn cần xác nhận.
- Chưa có biên bản nhóm, review C hoặc nghiệm thu F02. Trạng thái commit/push tra theo Git; bàn giao này không ghi nhận PR đã được tạo hoặc review.

## Cập nhật hai actor — 10/11/2026

A đã duyệt phương án Nhân viên/Quản lý. Đã cập nhật bảng, actor từng đặc tả, nguồn sơ đồ và sổ quyết định; render lại SVG. Chưa có review mới của C hoặc triển khai phân quyền.
Đã đối chiếu actor trong 12 đặc tả và sơ đồ: Nhân viên có 6 liên kết UC, Quản lý có 12.
Đã xem PNG chuyển từ SVG: đủ hai actor và 12 UC, chữ không bị cắt; `git diff --check` đạt.
