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

## Đề xuất nền UC01 của A — 11/11/2026

- Nguồn: người dùng yêu cầu lập todo và bắt đầu hoàn thiện nền Sprint 1 trên nhánh riêng.
- Đã soạn [todo A](../docs/tasks/a-sprint1-todo.md) và
  [thiết kế UC01](../docs/architecture/uc01-catalog-brand-design.md).
- Đề xuất: danh mục/thương hiệu phẳng, id ổn định; tên duy nhất trong từng bảng;
  xóa mục chưa tham chiếu, giữ FK khi đã có sản phẩm; API quản lý dành cho Quản lý.
- Bổ sung [ERD miền A](../docs/architecture/erd-mien-a.md): hai bảng danh mục/thương hiệu
  và liên kết dự kiến với sản phẩm; quan hệ bắt buộc một danh mục/một thương hiệu là đề xuất
  chờ B/A xác nhận, chưa thay thiết kế miền B.
- Còn mở: so sánh tên có dấu, trạng thái ngừng dùng, tính bắt buộc của quan hệ sản phẩm,
  route đọc cho Nhân viên, hợp đồng API chung, nhận diện vai trò và công cụ backend/migration.
- Ảnh hưởng: B đối chiếu miền sản phẩm và hợp nhất schema; C rà/hợp nhất API;
  A hợp nhất ERD và làm khung backend sau lựa chọn kỹ thuật được xác nhận.
- Trạng thái: bản nháp để review, chưa có xác nhận B/C hoặc đồng thuận nhóm; chưa cài
  dependency, tạo migration/backend hay chạy test ứng dụng. Không thay plan chung.

## Đề xuất công cụ backend tối giản — 11/11/2026

- A yêu cầu tiếp tục chuẩn bị khung backend; đã có [bản đề xuất](../docs/architecture/backend-foundation.md).
- Trợ lý đề xuất Express 5 + TypeScript + mysql2/promise, SQL trực tiếp, tsc và node:test.
- Máy hiện có Node v26.13.0/npm 12.2.2; phiên bản dùng chung chưa chốt.
- Người dùng đã tự cài dependency theo hướng dẫn. Đã viết khung backend dùng lại
  APP_MYSQL_* từ .env.docker; build và 6 test đạt. Kết nối thật chưa đạt (ECONNREFUSED),
  docker ps không có container chạy. Chưa nghiệm thu hoặc có review nhóm.

## Triển khai bản đầu UC01 — 11/11/2026

- Nguồn: A yêu cầu tiếp tục schema và API UC01; giữ nhánh docs/a-sprint1-foundation.
- Đã thêm migration/seed và CRUD categories/brands; BIGINT UNSIGNED, tên VARCHAR(100),
  UNIQUE utf8mb4_0900_as_ci, DATETIME(3); API trim/NFC và id chuỗi.
- Token manager local qua APP_MANAGER_TOKEN là lựa chọn tạm của trợ lý để API không mở
  quyền ghi khi chưa có nhận diện chung; chưa là hệ thống hai vai trò được nhóm chốt.
- Kiểm chứng: 11 test đạt; schema tạm trên lab kiểm tra CRUD, trùng đồng thời, dấu, FK fixture
  và HTTP thật đạt; đã tạo hai bảng trong MySQL app, không nạp seed hoặc chạy test phá dữ liệu app.
- Phụ thuộc: B ghép migration/FK products thật; C ghép UI; cần thiết kế danh tính chung.
  Review kỹ thuật bằng trợ lý không thấy lỗi quan trọng, không thay review B hoặc nghiệm thu nhóm.
- Chưa Done UC01; chưa push/merge. Chi tiết cách chạy và giới hạn ở backend/README.md.

## Đề xuất nền UC02–03 của B — 13/11/2026

- B soạn ERD linh kiện và nhà cung cấp để A ghép ERD chung và C/D/E dùng dữ liệu mẫu.
- Đề xuất theo ERD UC01. Mỗi sản phẩm có một danh mục và một thương hiệu. Hai FK dùng
  `BIGINT UNSIGNED NOT NULL` để khớp PK của UC01 và `ON DELETE RESTRICT` để giữ liên kết.
  Bản nháp khớp F04 về ID, SKU, giá VND `DECIMAL(15,0)` và trạng thái sản phẩm.
  B đề xuất JSON object cho thông số và trường liên hệ tùy chọn cho nhà cung cấp.
- Còn mở gồm giá bán bằng 0, cách ngừng sử dụng nhà cung cấp và hợp đồng API.
  D/E cần xác nhận ai viết và cách gọi cơ chế tạo dòng tồn bằng 0 theo F03 Q6.
- Trạng thái bản nháp đã kiểm tra trên MySQL lab 8.4.13, chờ C review, A ghép ERD và
  D/E rà phần chứng từ, tồn kho. Xem [erd-mien-b.md](../docs/architecture/erd-mien-b.md)
  và [database/seed/README.md](../database/seed/README.md#dữ-liệu-mẫu-uc0203).

Khi bổ sung quyết định: ghi ngày, người tham gia, vấn đề, phương án, lý do, ảnh hưởng,
trạng thái và liên kết biên bản/PR. Không biến đề xuất thành đồng thuận hoặc bịa lịch sử họp.
