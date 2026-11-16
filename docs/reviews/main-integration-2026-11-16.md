# PR tích hợp nền vào main — 16/11/2026

A đã yêu cầu bắt đầu sau khi đọc đề xuất Nam. Hướng chọn: một PR
`integration/a-sprint2-review` → `main`, **Create a merge commit**, giữ commit/tác giả/SHA.
Đây là mốc tích hợp nền để mọi người tạo nhánh mới; nghiệm thu Sprint 1–2 vẫn còn thiếu
module/lab/phân quyền/review theo [bàn giao](../handoffs/a-acceptance-2026-11-16.md).

## Trạng thái đã kiểm tra

- Main `dbc806f`; bản ứng viên ban đầu `a834aa1`, main là tổ tiên, hơn 19 commit.
  Mọi nhánh remote đều nằm trong ứng viên khi fetch 16/11. Working tree trước sửa sạch.
- GitHub API công khai: main `protected: false`; điều đó không thay yêu cầu review trong
  CONTRIBUTING.md và không chứng minh mọi ruleset/cài đặt repo đều đã kiểm tra.
- Có PR [#3 của Tuấn](https://github.com/fluoxetines73/partstock_dbms/pull/3), base hiện tại
  `docs/a-sprint1-foundation`, head `7038bb6`. Cần ghi PR này được bao phủ trong PR tích hợp;
  sau khi main chứa head B thì đóng PR trùng và liên kết PR tích hợp, trước khi xóa base B.
  API `/pulls/3/reviews` trả danh sách rỗng; PR #2 của Nam đã đóng nhưng chưa merge,
  không được coi PR đóng là đã review/merge. PR #1 môi trường đã merge.
- Chưa có PR tích hợp trên GitHub tại lần kiểm tra. Máy có SSH push nhưng thiếu gh/token/
  trình duyệt kết nối; chưa thể tạo PR, đăng comment hoặc merge qua PR.
- Link diff trong bàn giao đã cố định bằng SHA để dọn nhánh không làm mất bằng chứng.
- Kiểm thử trên `a834aa1`: backend 11/11, browser 5/5, build frontend PASS ngày 16/11;
  integration UC01/UC02–03 đã PASS trước đó, code không đổi. Lượt chuẩn bị PR chỉ sửa tài liệu.
  Storage giữ số liệu chính thức 15/11; không bịa lần chạy lab mới.

## Body PR để đăng

**Title:** `merge: tích hợp nền PartStock và các đầu ra đã bàn giao vào main`

Main hiện mới có tài liệu/môi trường; code backend, migration A/B, UI UC01 và lab đã
bàn giao nằm trên chuỗi nhánh riêng. PR đưa các phần này cùng F02 và nháp F03/F04 vào
một nền chung để C/D/E tiếp tục module từ main. Dùng merge commit giữ lịch sử A/B/D.
Bao phủ các commit của PR #3; không merge riêng thêm một lần cùng phạm vi.

Phạm vi: backend Express/TypeScript, migration/seed UC01–03, UI UC01, Storage A,
Indexing/backup-restore B, đặc tả hai actor, nháp kho/chứng từ Nam, ERD/báo cáo/bàn giao.
F03/F04 giữ nhãn nháp; token quản lý là local tạm. Chưa có đủ app hai actor, miền C/D/E
hoặc năm lab hoàn chỉnh. Merge nền không ghi Sprint 1–2 Done và không tự chốt kho/doanh thu.

Kiểm chứng trên ứng viên ban đầu a834aa1: 11/11 backend test, 5/5 browser qua MySQL lab,
frontend build PASS; integration UC01/UC02–03 PASS. Diff chuẩn bị tiếp theo chỉ sửa docs/link.
Không chạy lại lab Indexing/restore B thay reviewer. Storage có số liệu năm pha hai hệ.
Điều kiện/cách chạy ở README backend/frontend/experiments; giới hạn ở bàn giao A.

Nhờ Tuấn review phần A, Khánh review B/F02/UI/API, Hải review nháp Nam theo plan.
Reviewer ghi phạm vi, commit đã xem, lỗi cần sửa hoặc kết luận. Chỉ merge sau khi có review
thật và xử lý lỗi quan trọng. Phần auth hai actor, thống nhất kho, kiểm thử máy thứ hai,
restore và đủ module/lab còn lại tiếp tục theo ownership, không phải điều kiện đủ để
nghiệm thu toàn sprint trong PR nền này.

## Điều kiện merge nền

- [x] Mọi head remote đã nằm trong ứng viên ban đầu; code/test và nguồn tác giả có bằng chứng.
- [x] Link review theo SHA; giữ rõ trạng thái nháp và việc còn thiếu.
- [ ] Tạo PR tích hợp, liên kết PR #3, ghi SHA ứng viên cuối.
- [ ] Review thành viên theo phạm vi hiện có; xử lý lỗi quan trọng, xác nhận trên head cuối.
- [ ] Kiểm tra remote không có head mới ngoài ứng viên trước khi merge.
- [ ] Merge commit qua PR, xác minh main chứa mọi head cần tích hợp.

## Sau merge và dọn nhánh

1. Ghi SHA/URL PR tích hợp và trạng thái hiện hành trong context/plan; nhật ký lịch sử giữ nguyên.
2. Xử lý PR #3: comment liên kết rồi đóng sau khi head B đã nằm trong main, không gọi đó là
   PR đã được reviewer approve nếu chưa có review. Không để PR đang mở trỏ vào base sắp xóa.
3. Xác nhận Tuấn đã ngừng dùng `feat/uc02-03` trước khi xóa remote B. Nam đã đề xuất đồng ý
   xóa nhánh D sau merge; kiểm tra không có commit mới trước khi xóa.
4. Nhánh A/lab/UI/integration và infra chỉ xóa khi main thực sự chứa tip. Nhánh local A
   `e4bfe10` đã rebase: range-diff cho thấy khác biệt tài liệu so với `24db24b`; giữ lại
   cho tới khi đối chiếu/xác nhận, không ép xóa bằng `-D`.
5. Các thành viên fetch/prune, cập nhật main và tạo nhánh task mới; không thay lịch sử đã chia sẻ.

Chưa merge/xóa nhánh ở mốc lập tài liệu này. Không thay branch protection/settings để né review.
