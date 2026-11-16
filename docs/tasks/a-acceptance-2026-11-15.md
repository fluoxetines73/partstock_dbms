# A — Hoàn thiện gói nghiệm thu ngày 15/11/2026

Owner: Đạt (A). Reviewer chính: Tuấn (B); Hải (E) chạy lại độc lập;
Khánh (C) rà giao diện/hợp đồng API. Trạng thái: đang thực hiện, chưa nghiệm thu.
Nguồn: [requirements](../requirements.md), [ownership](../ownership.md),
[plan](../plan.md), [thiết kế UC01](../architecture/uc01-catalog-brand-design.md).

## Phạm vi và lựa chọn

Hoàn thiện phần A trên các nhánh task, không sửa main hoặc viết lại lịch sử nhánh người khác.
Giữ 12 UC/hai actor, MySQL app và hai DBMS lab. Không tự chốt quy tắc kho/doanh thu còn mở.
Ghi rõ tác giả nguồn, reviewer, bằng chứng thật và phụ thuộc. Review kỹ thuật tự động không
thay review thành viên. Không nhận thay việc UC02–12 hoặc kết quả lab C/D/E.

UC01 dùng một trang gồm hai tab Danh mục/Thương hiệu, bảng tên, thêm/sửa tên,
xác nhận trước xóa và thông báo khi mục đang được sản phẩm sử dụng. Bố cục đơn giản,
dùng bàn phím được và co giãn trên màn nhỏ; không cần Figma để triển khai trang này.
Tách component UC01 để C ghép vào khung UI chung. Token quản lý local chỉ ở bộ nhớ phiên,
không lưu localStorage, URL, mã nguồn hoặc log; chưa thay đăng nhập/phân quyền hai actor.
React + Vite theo định hướng repo; cài dependency phải có đồng ý riêng theo AGENTS.md.

## Todo và tiêu chí

- [x] Kiểm tra remote: fetch ngày 15/11, B ở 7038bb6; chưa có nhánh C/E.
- [x] Commit lab Storage riêng 7a263bc; push experiment/a-storage-management.
- [x] Baseline backend: 11/11 test đạt ngoài sandbox (test cần cổng localhost).
- [x] Kiểm tra UC01 qua HTTP với migration sản phẩm thật của B: CRUD, đổi tên giữ FK,
  xóa bị chặn, tên trùng đồng thời và lỗi quyền; dùng schema ngẫu nhiên trên lab, tự dọn.
- [x] Làm UI UC01 và kiểm tra: tên rỗng/dài, lỗi trùng/FK, đang tải, lỗi mạng,
  xác nhận xóa, nhấp lặp, đổi tab khi request còn chạy. Không báo thành công khi request lỗi.
- [x] Ghép tài liệu F02 và nháp D hiện có thành bản review; ERD chỉ rõ bảng đã có DDL
  và miền D/E chưa triển khai. Ghi những quyết định cần người khác xác nhận.
- [x] Viết bàn giao, demo A, bảng nghiệm thu và nội dung PR/comment cụ thể theo người nhận.
- [x] Review kỹ thuật, sửa lỗi quan trọng, kiểm tra cuối và commit/push các nhánh task.
- [ ] Tuấn review A; Hải chạy lại; Khánh ghép UI/API; nhóm review/tích hợp trước khi ghi Done.

## Kiểm chứng

Backend: `npm test --prefix backend`, `npm run test:db --prefix backend`, integration UC02–03.
UI: kiểm tra hành vi component/API, build và demo nếu được cài nền React/Vite.
Lab Storage: dùng kết quả đã chạy, không chạy lại chỉ để đổi số liệu.
Tài liệu: kiểm tra diff, đường dẫn tương đối, nguồn branch/commit, không ghi PASS chưa chạy.

## Nhật ký quyết định thực hiện

- Làm trực tiếp trên nhánh task theo yêu cầu trước đó; không tạo thêm worktree làm khó theo dõi.
- Nền UI tối giản chỉ phục vụ UC01; quyền phụ trách khung chung của C giữ nguyên.
- GitHub hiện có SSH để push; chưa có gh/token hoặc trình duyệt kết nối để tạo PR/comment.
  Chuẩn bị nội dung trong repo trước, không ghi là đã gửi khi chưa gửi.
- Người dùng đã đồng ý cài React/Vite; đã cài React 19.3.1/Vite 8.3.8 và Playwright 1.61.1.
- a3fcd35: test lab tái hiện ID 10 đứng trước 2; sửa ORDER BY cột số, test đạt.
- UI: build đạt, 5/5 browser test đạt với MySQL lab thật. Đã xem ảnh desktop/mobile;
  không tràn ngang ở 390 px. Bản đầu test thất bại do chưa có giao diện, đạt sau triển khai.
- Backend: 11/11 test đạt; integration UC01 và UC02–03 đạt. Token local chưa là hai vai trò.
- Review kỹ thuật độc lập bằng trợ lý: phát hiện mất focus khi đóng modal, test tái hiện
  trước sửa; bổ sung trả focus về nút mở/nút Thêm sau xóa. Không thay review B/C/E.
- Giới hạn nhỏ còn lại: dừng fixture ngay lúc khởi tạo có thể để sót schema lab ngẫu nhiên;
  đã ghi cách nhận diện/dọn trong frontend/README.md. Không ảnh hưởng dữ liệu app.
- 16/11: tiếp tục sau gián đoạn; fetch không có code mới từ B/C/D/E. Nhánh integration
  ghép F02/Nam với lịch sử nguyên vẹn; xung đột tài liệu giữ nội dung cả A/B/D.
  [Bàn giao](../handoffs/a-acceptance-2026-11-16.md) có nội dung PR/comment chưa gửi,
  ERD tổng hợp, demo A và báo cáo bản đầu. Mốc 15/11 chưa đạt, không đổi hạn để ghi Done.
- Kiểm tra cuối 16/11 trên nhánh tích hợp: backend 11/11 và frontend build đạt. Browser
  ban đầu không khởi động fixture được (ECONNREFUSED), xác minh MySQL lab đã dừng 12 giờ;
  khởi động riêng mysql-lab, đợi healthy và chạy lại 5/5 đạt. Không sửa code để né lỗi môi trường.
  Diff/đường dẫn Markdown đạt; source F02/Nam khớp nhánh gốc, backend/frontend khớp nhánh UC01.
