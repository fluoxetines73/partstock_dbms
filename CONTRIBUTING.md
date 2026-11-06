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
Repo đã có Git và remote origin. Làm trên nhánh task, push nhánh và tạo PR khi được yêu cầu;
không push thẳng main hoặc tự coi PR đã được review. Thành viên thử môi trường theo
[hướng dẫn local](setup-local-docker.md) và ghi kết quả thật vào KIEM-TRA.md.

## Nhịp nhóm

Đầu sprint 30 phút; cập nhật hằng ngày bằng tin nhắn: đã làm, tiếp theo, vướng mắc.
Giữa sprint 15 phút rà rủi ro; cuối sprint 45–60 phút demo/review, dùng mẫu biên bản.
Bị chặn quá một ngày báo A. Dùng seed/mock theo hợp đồng chung để làm song song.
A chủ trì phạm vi/thiết kế/ưu tiên; B–E đóng góp chuyên môn. Ghi thay đổi chung vào agent/decisions.md.

## Definition of Done

Chạy trong bản tích hợp, đúng nghiệp vụ, có review và bằng chứng kiểm tra thật.
Thực nghiệm có script/data/điều kiện/kết quả/giải thích; backup phải restore và đối chiếu.
Báo cáo có trích dẫn và bằng chứng; có file chưa có nghĩa đã Done. Script kiểm tra hạ tầng ở
database/local/; ứng dụng chưa có lệnh test. Task môi trường cần reviewer và một thành viên
khác tái tạo được cấu hình trước khi ghi Done.
