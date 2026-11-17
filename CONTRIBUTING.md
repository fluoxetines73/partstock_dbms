# Cộng tác

A–E tự nhận tên thật trong docs/ownership.md khi thống nhất. Mỗi người chịu trách nhiệm xuyên suốt
UI–API–database, thực nghiệm hai hệ và phần báo cáo/demo của mình. Owner điều phối, không độc quyền sửa file.

## Task và Git

Board: Backlog → Ready → In progress → Review/Test → Done.
Mỗi task ghi owner, reviewer, hạn, phụ thuộc, tiêu chí nghiệm thu và đường dẫn bằng chứng.
Nhánh đề xuất: `feat/uc07-sales`, `docs/report`, `experiment/indexing`; commit nhỏ, mô tả mục đích.
Trước sửa đọc AGENTS.md áp dụng, kiểm tra diff và giữ thay đổi người khác.
PR nêu vấn đề, thay đổi, kiểm chứng đã chạy, phần chưa kiểm chứng và tài liệu ảnh hưởng.
Có ít nhất một người khác review; A điều phối tích hợp và kiểm soát merge, code A cũng được review.
Không tự push/merge/tạo remote hoặc đổi branch protection khi chưa được yêu cầu.
Repo đã có Git và remote origin. Dùng mẫu PR trong `.github/pull_request_template.md`.
Làm trên nhánh task, push nhánh và tạo PR khi được yêu cầu;
không push thẳng main hoặc tự coi PR đã được review. Thành viên thử môi trường theo
[hướng dẫn local](setup-local-docker.md) và ghi kết quả thật vào KIEM-TRA.md.

## Nhịp nhóm

Sprint theo tuần, theo dõi năm gói cá nhân và mốc bàn giao trong [plan](docs/plan.md).
Không bắt buộc lịch họp hoặc chia nhỏ mọi bước thành task phối hợp. Mỗi người tự triển khai
phần mình; cập nhật khi bàn giao, có review hoặc bị chặn. Báo ngay A và người nhận khi đầu vào trễ.
Review theo gói; người viết tiếp tục phần độc lập trong lúc chờ review. Dùng seed/mock theo
cấu trúc chung để làm song song; nghiệm thu vẫn cần bản tích hợp thật.
A chủ trì phạm vi/thiết kế/ưu tiên; B–E đóng góp chuyên môn. Ghi thay đổi chung vào agent/decisions.md.

## Pilot bảng tiến độ

1. Mở `docs/status/index.html` từ bản checkout bằng trình duyệt. Trang chạy trực tiếp từ file.
2. Khi có bàn giao, kết quả review hoặc vướng mắc, sửa file trong `docs/status/` theo mã của mình:
   Đạt `a.js`, Tuấn `b.js`, Khánh `c.js`, Nam `d.js`, Hải `e.js`. Ghi `updated` theo `YYYY-MM-DD`,
   một câu hiện trạng (`summary`), một việc tiếp theo hoặc đầu vào đang chờ (`next`), và link
   bằng chứng nếu có (`links`, đường dẫn tính từ `docs/status/`, để `[]` nếu chưa có).
   Chọn `stage` theo plan: `working`, `review`, `fix`, `accepted`. Dùng `accepted` khi đủ điều kiện nghiệm thu.
3. Tải lại trang để kiểm tra, rồi commit và push nhánh làm việc theo luồng PR hiện có.
   Sau khi tích hợp, mọi người pull nhánh chung rồi tải lại trang để xem trạng thái mới.

Bản đầu lấy từ bằng chứng đã có trong repo ngày 16/11. Nhóm thử một lượt cập nhật theo gói trong
Sprint 3 rồi quyết định có dùng bảng làm nơi cập nhật trạng thái hằng ngày hay không.

## Definition of Done

Chạy trong bản tích hợp, đúng nghiệp vụ, có review và bằng chứng kiểm tra thật.
Thực nghiệm có script/data/điều kiện/kết quả/giải thích; backup phải restore và đối chiếu.
Báo cáo có trích dẫn và bằng chứng; có file chưa có nghĩa đã Done. Script kiểm tra hạ tầng ở
database/local/; lệnh test ứng dụng/lab ở README backend/frontend/experiments, ghi đúng phạm vi đã chạy.
Task môi trường cần reviewer và một thành viên
khác tái tạo được cấu hình trước khi ghi Done.
