# Sổ quyết định

## Đã chốt theo yêu cầu đề tài

- Một cửa hàng/một kho; ứng dụng dùng MySQL, MongoDB phục vụ đối chiếu, không đồng bộ hai hệ.
- Năm chủ đề bắt buộc, mỗi người làm cả hai DBMS; backup/restore là phần bổ sung.
- Deadline 30/11/2026, giờ LMS; A nộp ZIP. Phân công A–E theo docs/ownership.md.
- Nháp chưa tác động tồn; không bán vượt tồn/hoàn kho lặp; lưu giá tại thời điểm bán;
  sản phẩm có lịch sử được ngừng kinh doanh.

## Đề xuất/định hướng, chưa phải đồng thuận toàn nhóm

- React + Vite, Node.js + Express + TypeScript, Docker Compose.
- Tên app `partstock`, lab `partstock_lab`; bắt buộc tách kết nối/cấu hình/quyền.
- Nhánh và quy trình PR trong CONTRIBUTING.md cần A đưa vào thiết lập repo.

## Còn mở — cần nhóm chốt

Các mốc 06/11 và Sprint 1 trong bảng dưới là mốc dự kiến ban đầu, chưa có bằng chứng
hoàn thành. Lịch hiện hành ngày 11/11: quyết định chung 11/11, nền 12/11, hoàn tất phần tồn
Sprint 1 và Sprint 2 trước 16/11; xem [kế hoạch](../docs/plan.md).
Điều chỉnh lịch không tự chốt nội dung quyết định. Các bản ghi bên dưới giữ lịch sử tại thời điểm ghi.

| Quyết định | Điều phối/đóng góp | Mốc dự kiến | Trạng thái |
|---|---|---|---|
| Schema, trạng thái chứng từ và hợp đồng API bản đầu | A / B–E | 06/11/2026 | Chưa chốt |
| Trạng thái được hủy, cách tính doanh thu sau hủy | A / C–D–E | 06/11/2026 | Chưa chốt |
| Cơ chế cập nhật kho/ghi biến động, transaction/khóa và chống lặp | D–E / A | 06/11/2026 | Chưa chốt |
| Phiên bản DB/runtime, topology MongoDB cho transaction | B–D / A | 06/11/2026 | DB/topology đã thử local, chờ review; runtime app chưa chọn |
| UI library, cách truy cập DB/ORM, hợp đồng seed/mock | C–B / cả nhóm | Sprint 1 | Chưa chọn |
| Credential/quyền và cấu hình tách app/lab | B / E | Sprint 1 | Đã có cấu hình local, chờ review và máy thứ hai kiểm chứng |

## Đề xuất triển khai môi trường local — 04/11/2026

- Nguồn: người phụ trách setup chọn phương án mỗi người chạy Docker trên máy riêng trong
  cuộc trao đổi; chưa có biên bản họp/review hoặc đồng thuận toàn nhóm.
- Vấn đề: tạo môi trường tái tạo được, tách ứng dụng và lab, hỗ trợ transaction MongoDB.
- Phương án đang triển khai thử: hai dịch vụ MySQL app/lab riêng; MongoDB lab rs0 một node;
  credential, kết nối, network và volume tách biệt; cổng chỉ gắn localhost.
- MySQL 8.4.13 và MongoDB 8.0.34 đã kiểm chứng local linux/amd64. Mẫu cấu hình ghim đúng
  digest image đã chạy trên máy này; xem `.env.docker.example`. Runtime app chưa được chọn.
- Lý do: dùng cùng cấu hình và image cho thành viên mới; reset/thử lab không dùng credential app.
  Mỗi máy giữ dữ liệu riêng, không có cơ chế đồng bộ dữ liệu giữa thành viên.
- Ảnh hưởng/giới hạn: replica set một node phục vụ lab transaction, không có failover; chưa
  kiểm tra ARM, máy thứ hai, backup/restore hoặc benchmark. Chưa có schema/seed nghiệp vụ.
- Trạng thái: đã kiểm chứng cá nhân, đề xuất trong PR, chờ B–D/A và reviewer nhóm thống nhất;
  chưa có PR/biên bản để liên kết. [Hướng dẫn](../setup-local-docker.md), [kết quả](../KIEM-TRA.md).

## Cập nhật kế hoạch và phân công chi tiết — 09/11/2026

- Nguồn: người dùng duyệt phương án trong phiên làm việc và yêu cầu viết lại `docs/plan.md`;
  cho phép sửa trực tiếp trên main. Chưa có biên bản họp hoặc xác nhận nhận việc của toàn nhóm.
- Vấn đề: kế hoạch tổng quan chưa chỉ rõ người thực hiện ERD/schema, phụ thuộc và đầu ra;
  mốc thiết kế 06/11 đã qua nhưng tài liệu chưa có bằng chứng hoàn thành.
- Phương án: bổ sung backlog có mã task, owner/reviewer, phụ thuộc và nghiệm thu; bố trí
  nền tảng 09–12/11, luồng tích hợp 15/11, đủ phạm vi/thực nghiệm và báo cáo bản đầu 22/11.
- Dợt toàn bộ 25/11, sửa 26/11, tổng duyệt 27/11, A đóng gói và E kiểm tra ZIP 28/11,
  dự phòng/đóng băng 29/11, A nộp 30/11 theo giờ LMS. A xác nhận giờ và thời lượng trình bày.
- Chi tiết hóa trách nhiệm: A hợp nhất ERD/khung backend; B hợp nhất migration/model lab
  và cơ chế chạy lab; C hợp nhất API/mock; E xác minh máy thứ hai và ZIP. Mỗi owner vẫn
  làm thiết kế/migration/API miền mình; D–E thống nhất cơ chế kho.
- Ảnh hưởng: dời hoàn thiện hủy đơn sang 19/11, backup/restore chạy được 19/11 và kiểm chứng
  22/11; giữ mục tiêu 12 UC, 8 thao tác, 5 chủ đề hai hệ và deadline. Không chọn ngầm công nghệ
  hoặc schema/API; không ghi nhận đã triển khai, review, họp hay thống nhất toàn nhóm.
- Theo dõi: [kế hoạch](../docs/plan.md), [ownership](../docs/ownership.md).
  Chưa có PR/biên bản để liên kết; từng thành viên cần xác nhận khả năng tham gia khi nhận task.

## Rà kế hoạch theo hiện trạng repo — 10/11/2026

- Nguồn: người dùng yêu cầu cập nhật kế hoạch trong phiên làm việc; chưa có xác nhận
  nhận việc, khả năng tham gia hoặc biên bản đồng thuận toàn nhóm mới.
- Vấn đề: bản 09/11 đã có backlog chi tiết; đến lần rà này repo vẫn chưa có thiết kế,
  app/schema/seed nghiệp vụ hay bằng chứng hoàn thành F01 và các quyết định nền tảng.
  Không suy ra thành viên chưa làm việc ngoài repo.
- Điều chỉnh: thêm ưu tiên ngày 10–12/11 và điểm kiểm soát thiết kế 10/11; chuyển hạn mục tiêu
  F01 từ 09/11 sang 10/11 để rà hiện trạng, khả năng tham gia, giờ LMS và phần việc đang chặn.
  Giữ hạn F02–F06 là 10/11, nền tảng 12/11 và các mốc tích hợp/dợt/đóng gói/nộp đã đặt.
- Ảnh hưởng: cập nhật [plan](../docs/plan.md) và [context](context.md); giữ phân công ownership,
  phạm vi 12 UC, 8 thao tác, 5 chủ đề trên hai hệ và deadline 30/11 theo giờ LMS.
  Không chốt schema/API/công nghệ hoặc ghi nhận hoàn thành thay cho owner/reviewer.
- Theo dõi: A và owner cập nhật bằng chứng, đầu ra còn thiếu và ảnh hưởng phụ thuộc khi nhận task;
  nếu thiết kế trễ, đánh giá rủi ro mốc 12/11 và 15/11, không mặc định dời các mốc tiếp theo.
  Đây là cập nhật tài liệu kế hoạch theo yêu cầu, chưa là nghiệm thu hay đồng thuận toàn nhóm;
  chưa tạo PR/biên bản trong phiên này.

## Đề xuất F03/F04 miền nhập–bán–kho — 10/11/2026

- Nguồn: D (Nam) yêu cầu soạn bản nháp trong phiên làm việc; chưa có E đồng soạn, review hoặc họp nhóm.
- Vấn đề: F03 và phần ERD miền D trong F04 hạn 10/11, đang chặn F04 chung, F06, F08, F13, LAB-D/E.
- Phương án đề xuất: [F03](../docs/architecture/f03-quy-tac-chung-tu-kho.md) — trạng thái
  DRAFT/CONFIRMED(/CANCELLED), chốt giá khi xác nhận, trừ tồn bằng UPDATE có điều kiện trong một
  transaction, sổ biến động chỉ thêm với UNIQUE chống ghi lặp, kiểm kê áp delta;
  [F04](../docs/architecture/f04-erd-mien-d.md) — bảng phiếu nhập, đơn bán, dòng, `inventory`, `stock_movements`.
- Còn mở: câu hỏi Q1–Q8 ở mục 8 của F03 (hủy phiếu nhập, hạn hủy, doanh thu sau hủy, chiết khấu,
  kiểm kê, dòng tồn khi tạo sản phẩm, thông tin khách, người dùng). Giả định cột của `products`/`suppliers`
  chờ B đối chiếu khi có thiết kế.
- Trạng thái: bản nháp, chưa review, chưa có migration/code/kết quả chạy. Chưa có PR/biên bản.

## Gom gói công việc và rút hạn Sprint 1–2 — 11/11/2026

- Nguồn: người dùng duyệt bản nháp trong chat và yêu cầu sửa trực tiếp trên main.
- Vấn đề: backlog nhỏ và phối hợp đan xen không phù hợp cách làm độc lập của nhóm;
  hiện đã là Sprint 2, cần hoàn tất Sprint 1–2 trước thứ Hai 16/11.
- Quyết định kế hoạch: giữ nguyên chủ đề DBMS, UC và trách nhiệm A–E; gom thành năm gói
  xuyên suốt, ghi rõ đầu vào/phụ thuộc và dùng seed/mock để triển khai song song.
- Mốc mới: thiết kế chung 11/11; nền 12/11; bản đầu 13/11; gói đầy đủ 14/11;
  nghiệm thu đủ app/lab/backup-restore và báo cáo bản đầu 15/11. Thay các hạn 19–22/11 cũ.
  Sprint 3 là 16–22/11, Sprint 4 là 23–29/11; nộp 30/11 theo giờ LMS.
- Review chính: B review A, C review B, A review C, D/E review chéo; E vẫn xác minh restore/ZIP.
  Không đặt lịch họp; báo ngay khi có phụ thuộc chặn người khác. Không đổi cơ chế kho ngầm.
- Tiến độ: hạ tầng đã có bằng chứng một máy; chưa có app/schema/seed/lab chuyên đề.
  F03/F04 miền D là nháp trên nhánh docs/f03-f04-inventory-transactions, commit daf1f1e,
  chưa có trên main tại lần rà; không tự merge hoặc ghi nhận đã chốt.
- Ảnh hưởng: cập nhật plan, ownership, context và nhịp cộng tác trong CONTRIBUTING;
  không đổi yêu cầu, tự chọn công nghệ/schema/API hoặc ghi nhận thành viên đã nhận/xong việc.
  Lịch rất gấp; trễ nền/bản đầu phải báo ảnh hưởng hạn 15/11, không tự coi là đạt.
- Trạng thái: người dùng đã duyệt kế hoạch; chưa có review nhóm/biên bản nghiệm thu trong phiên này.
  Xem [plan](../docs/plan.md), [ownership](../docs/ownership.md).

## Đối chiếu nhánh F03/F04 với plan mới — 11/11/2026

- Nguồn: người dùng yêu cầu merge main về nhánh thiết kế và kiểm tra commit vừa rồi.
- Kế thừa plan từ commit `dbc806f`: năm gói cá nhân, giữ UC/chủ đề/ownership; thiết kế 11/11,
  nền 12/11, bản đầu 13/11, gói cá nhân 14/11, nghiệm thu tích hợp 15/11.
- Xử lý xung đột: dùng lịch hiện hành từ main trong plan/context; giữ các bản ghi ngày 10/11
  như lịch sử, không áp lại hạn 19–22/11. F03/F04 tiếp tục là nháp trong gói D, chờ E review,
  C đối chiếu doanh thu và A điều phối chốt. Không đổi schema/API/quy tắc nghiệp vụ thay nhóm.
- Chỉnh bản nháp: ghi rõ D dùng dữ liệu mẫu và tự triển khai miền mình, phối hợp giao diện kho
  với E; sửa truy vấn kiểm tra I4 để coi số biến động vắng mặt là 0, tránh bỏ sót dòng đã xác nhận
  thiếu biến động; làm rõ rollback toàn bộ transaction khi hết thời gian chờ khóa.
- Kiểm tra I4: chạy truy vấn từ tài liệu trên SQLite in-memory với 9 tình huống; kết quả đúng
  danh sách vi phạm mong đợi. Truy vấn cũ bỏ sót hai ca CONFIRMED/CANCELLED không có biến động.
  Đây là kiểm tra logic truy vấn, không phải kiểm chứng schema/transaction trên MySQL.
- Chưa có migration/code nghiệp vụ hay kết quả MySQL/MongoDB cho bản thiết kế; merge local
  không đồng nghĩa thiết kế được duyệt hoặc gói D đã nghiệm thu. Commit `daf1f1e` được giữ nguyên.

Khi bổ sung quyết định: ghi ngày, người tham gia, vấn đề, phương án, lý do, ảnh hưởng,
trạng thái và liên kết biên bản/PR. Không biến đề xuất thành đồng thuận hoặc bịa lịch sử họp.
