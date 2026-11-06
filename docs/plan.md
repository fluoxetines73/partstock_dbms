# Kế hoạch Agile

Kế hoạch gốc bắt đầu **04/11/2026**; hạn nộp **30/11/2026**, giờ theo LMS.
Đây là kế hoạch, không tự ghi nhận các mốc đã hoàn thành. Tiến độ môi trường local và
phạm vi kiểm chứng thực tế được ghi riêng trong [KIEM-TRA.md](../KIEM-TRA.md).
Không tự đổi deadline khi cập nhật ngày, không có ước lượng giờ chưa được nhóm xác nhận.

## Nhiệm vụ theo sprint

| Sprint / mốc | A | B | C | D | E |
|---|---|---|---|---|---|
| S1: 04–08/11 | Repo/Git, backlog; chủ trì schema/API; UC01; demo storage hai hệ | Môi trường/seed; thiết kế UC02–03; demo index hai hệ | Khung UI, hợp đồng tìm/lọc/doanh thu; demo query plan hai hệ | Quy tắc kho với E; hợp đồng nhập/bán/hủy; demo transaction hai hệ | Quy tắc biến động với D; thiết kế lịch sử/cảnh báo/kiểm kê; demo concurrency hai hệ |
| S2: 09–15/11 | Tích hợp chuỗi nghiệp vụ; UC01; kết quả storage đầu tiên | Sản phẩm/nhà cung cấp; seed và backup/restore chạy được; kết quả index | Tìm kiếm/lọc; doanh thu bước đầu; kết quả query processing | Tích hợp nhập → bán → hủy → đối chiếu tồn; lỗi giữa chừng; kết quả transaction | Lịch sử/cảnh báo; đối chiếu tồn và test tích hợp/đồng thời; kết quả concurrency |
| S3: 16–22/11 | Rà đủ 12 UC; storage đầy đủ; ghép báo cáo bản đầu | Hoàn thiện UC02–03/index; backup/restore cả hai hệ với E | Hoàn thiện UC05–06–11/query; đối chiếu 8 dạng thao tác | Hoàn thiện UC04–07–08/transaction và chống lặp | Hoàn thiện UC09–10–12/concurrency; xác minh restore và tích hợp |
| S4: 23–27/11 | Điều phối sửa lỗi, báo cáo tổng thể và ZIP dự kiến | Chạy môi trường sạch, hướng dẫn setup/seed/backup; sửa phần mình | Rà UI/8 thao tác, báo cáo và diễn tập phần mình | Rà giao dịch/lỗi, báo cáo và diễn tập phần mình | Rà tích hợp/đồng thời/restore, báo cáo và diễn tập phần mình |

06/11: chốt thiết kế bản đầu; B–D kiểm tra cấu hình MongoDB hỗ trợ transaction.
Review/demo và biên bản: 08/11, 15/11, 22/11, 27/11.
Cuối S3 cần đủ 12 UC, 8 dạng thao tác, năm chủ đề trên hai hệ, backup/restore đã kiểm chứng,
báo cáo bản đầu. S4 hoàn thiện tài liệu, chạy sạch, diễn tập và ZIP dự kiến.
28–29/11: cả nhóm dự phòng/sửa lỗi và hồi quy phần bị sửa; đóng băng bản nộp;
A và một người khác được phân công kiểm tra ZIP (người thứ hai chưa chốt).
30/11: A nộp theo giờ LMS và lưu xác nhận.

## Nhịp và theo dõi

Đầu sprint 30 phút; cập nhật hằng ngày bằng tin nhắn; giữa sprint 15 phút rà rủi ro;
cuối sprint 45–60 phút demo/review và biên bản theo [mẫu](meetings/TEMPLATE.md).
Board: Backlog → Ready → In progress → Review/Test → Done.
Mỗi task có owner, reviewer, hạn, phụ thuộc, tiêu chí nghiệm thu và bằng chứng.
Reviewer cụ thể được chỉ định khi nhận task, không mặc định đã review; code A cũng được người khác review.

## Phụ thuộc và rủi ro

Schema/API → sản phẩm/nhà cung cấp → nhập/bán → lịch sử/doanh thu.
D–E chốt cơ chế kho chung; seed/mock theo hợp đồng để làm song song.
B phụ trách môi trường, A xác nhận cả nhóm chạy được. B–D kiểm tra transaction MongoDB sớm.
Chặn quá một ngày báo A; thay đổi chung ghi agent/decisions.md và đưa nhóm thống nhất.
Ưu tiên ứng dụng/demo DBMS (mỗi phần 30%) đồng thời thu bằng chứng teamwork/báo cáo.

## Definition of Done

Chạy trong bản chung, đáp ứng nghiệp vụ, được review, có bằng chứng thật.
Thực nghiệm có script/data/điều kiện/kết quả/giải thích trên cả hai hệ;
backup đã restore và kiểm chứng. Báo cáo có trích dẫn/bằng chứng.
Có file không đồng nghĩa hoàn thành; chưa chạy phải ghi rõ. Chưa thiết lập lệnh kiểm thử hiện tại.
