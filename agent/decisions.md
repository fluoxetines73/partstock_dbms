# Sổ quyết định

## UC11 sau hủy khác kỳ · 28/11/2026

- Khánh đối chiếu đề xuất A ở F03 với truy vấn và dữ liệu từ migration 003 của Nam. Cách đang chạy cộng giá chốt của các dòng thuộc đơn hiện còn `CONFIRMED` vào kỳ có ngày xác nhận, theo giờ Việt Nam (+07:00).
- Ví dụ trong [test HTTP](../backend/tests-db/queries.cjs): một đơn trị giá 999.999 VND xác nhận ngày 15/11 rồi hủy ngày 02/12 bị loại khi xem lại tháng 11. Tháng 12 không ghi khoản âm cho lần hủy đó. Một đơn khác xác nhận đúng 01/12 được tính vào tháng 12.
- [Review của Đạt ngày 24/11](https://github.com/fluoxetines73/partstock_dbms/blob/c9052a9e72e0b3a5679199475bd72a0d15211800/docs/reviews/a-review-c-query-2026-11-24.md) yêu cầu gắn kỳ vào kết quả. UI lấy ngày bắt đầu và ngày kết thúc loại trừ từ phản hồi API.
- Trạng thái: đã đối chiếu hành vi triển khai, chờ A/C/D xác nhận phương án doanh thu khi hủy khác kỳ. Câu hỏi về quyền và thời hạn hủy vẫn theo [F03](../docs/architecture/f03-quy-tac-chung-tu-kho.md).

## Hợp đồng ngừng kinh doanh linh kiện UC02 — 23/11/2026

- Tuấn triển khai thao tác Quản lý qua `PATCH /api/products/:id` với `status: DISCONTINUED`,
  dùng cột trạng thái hiện có. Gửi lặp trả lại linh kiện đã ngừng kinh doanh; UC02 chỉ hỗ trợ
  chuyển một chiều trong lần này. Thao tác giữ nguyên tồn kho và chứng từ cũ.
- UC04/07 tiếp tục chặn thêm hoặc xác nhận nháp chứa linh kiện ngừng kinh doanh. UC08 vẫn
  hoàn kho khi hủy đơn đã xác nhận. Chờ Khánh review [hợp đồng API](../docs/architecture/api-contract.md#uc02--ngừng-kinh-doanh-linh-kiện).

<a id="q01-nha-cung-cap"></a>

## Đề xuất Q01 về nhà cung cấp — 22/11/2026

- Tuấn (B) đề xuất quy tắc cho UC03 và phần liên quan của UC04. Phần UC02–03 đã bàn giao ở
  [PR #3](https://github.com/fluoxetines73/partstock_dbms/pull/3) được tiếp nhận vào `main` qua
  [PR #4](https://github.com/fluoxetines73/partstock_dbms/pull/4). Q01 tiếp tục được theo dõi ở
  [đặc tả F02](../docs/architecture/use-cases.md#uc03).
- Quản lý chỉ được xóa nhà cung cấp khi không còn bản ghi nào tham chiếu. Phiếu nhập nháp và phiếu
  đã xác nhận đều chặn xóa qua khóa ngoại `ON DELETE RESTRICT` trong
  [migration 003](../database/mysql/migrations/003_inventory_documents.sql).
- Quản lý có thể ngừng sử dụng nhà cung cấp và vẫn xem được thông tin của họ trong UC03 và các
  phiếu nhập cũ. UC04 chỉ cho chọn nhà cung cấp đang sử dụng khi lập phiếu mới hoặc đổi nhà cung cấp
  trên phiếu nháp.
- Phiếu nháp đã chọn nhà cung cấp trước khi họ ngừng sử dụng được xác nhận tiếp với nhà cung cấp
  đang gắn trên phiếu, miễn là các điều kiện xác nhận khác vẫn đạt. Người dùng vẫn xem được nhà
  cung cấp đó khi mở lại phiếu. Quy tắc này giữ lịch sử và cho phép hoàn tất phiếu đang xử lý.
- Trạng thái: Tuấn đã chọn phương án đề xuất. Chờ Đạt chốt Q01, Khánh review UC03/API và Nam xác
  nhận luồng UC04. Các phần Q01 về danh mục và thương hiệu tiếp tục theo dõi trong F02.

## Cài đặt UC04/07/08 theo đề xuất F03/F04 — 17/11/2026

- Nguồn: D (Nam) yêu cầu làm hết gói D trong phiên làm việc; agent cài đặt theo F03/F04 trên nhánh `feat/uc04-07-08-transactions`.
  Chưa có PR, chưa có review của E, chưa có biên bản nhóm. **Các đề xuất F03 Q1–Q8 được dùng làm mặc định để có code chạy được,
  không phải đồng thuận nhóm.** Nếu nhóm chọn khác, đổi ở nơi ghi bên dưới.
- Mặc định đang được cài đặt: Q1 không hủy phiếu nhập đã xác nhận (API không có route); Q2 hủy đơn không giới hạn thời gian, bắt buộc lý do,
  chỉ Quản lý; Q3 doanh thu phương án A (C đã dùng, đơn hủy bị loại); Q4 không chiết khấu/thuế; Q5 kiểm kê chưa cài (thuộc E);
  Q6 tạo dòng tồn 0 trong cùng transaction với `POST /api/products` và backfill trong migration 003; Q7 chỉ `customer_name` tùy chọn;
  Q8 không có bảng người dùng.
- Quyết định kỹ thuật D tự đặt, cần E/A xác nhận: mã chứng từ `PN-`/`DB-` + ngày VN + ID 6 chữ số do server sinh;
  `confirmed_at`/`cancelled_at`/`occurred_at` ghi giờ VN (+07:00) bằng `CONVERT_TZ(UTC_TIMESTAMP(3), ...)`; sửa nháp là thay toàn bộ dòng
  (`PUT`); xác nhận/hủy lặp trả `409` kèm trạng thái hiện tại (không trả `200` kiểu "đã xác nhận" như lab của E); deadlock chạy lại tối đa 3 lần.
- Cơ chế kho dùng chung D–E: `inventory.quantity_on_hand` với `CHECK >= 0`, `stock_movements` chỉ thêm, UNIQUE `(movement_type, dòng chứng từ)`,
  tồn trừ bằng `UPDATE ... WHERE quantity_on_hand >= q`. **Chưa thống nhất với E:** lab concurrency của E dùng cột `stock_version`
  để chặn kiểm kê với số đếm cũ (`STALE_COUNT`), còn F03 mục 4 đề xuất áp delta lên tồn hiện tại. Migration 003 không có `stock_version`
  và chưa có bảng kiểm kê; E cần chọn phương án rồi thêm cột/bảng bằng migration 004. Ngưỡng cảnh báo UC10 cũng chưa có chỗ lưu.
- Sửa test của người khác để chạy trên schema thật: `backend/tests-db/queries.cjs` (C) bỏ fixture `inventory/sales_*` tự tạo, kiểm tra
  chế độ chỉ-có-danh-mục bằng cách áp 001–002 trước rồi 003; `backend/tests-db/uc02-03.cjs` (B) cập nhật danh sách migration;
  `ui-server.cjs` (A) nạp 003 và mở route của D; `frontend/tests/queries.spec.js` (C) ca "chưa có tồn" thành "đọc tồn thật".
  Các ca cũ về `STOCK_UNAVAILABLE` vẫn được kiểm ở bước chỉ-có-danh-mục. C và A nên xem lại các thay đổi này.
- Chưa áp migration 003 vào MySQL app `partstock`; chỉ chạy trên schema dùng một lần ở `mysql-lab`.
- Bằng chứng: [bàn giao D](../docs/handoffs/d-sprint2.md), [lab Transaction](../experiments/transactions/README.md).

## Chuẩn bị PR tích hợp nền — 16/11/2026

- A yêu cầu bắt đầu theo đề xuất Nam và nhận xét: một PR integration/a-sprint2-review vào main,
  merge commit giữ tác giả/SHA; tách điều kiện merge nền khỏi nghiệm thu toàn Sprint 1–2.
- Đã cố định link bằng chứng theo SHA và lập [body/checklist PR](../docs/reviews/main-integration-2026-11-16.md).
  Đây chỉ là sửa tài liệu; code/backend/frontend/lab giữ nguyên ứng viên a834aa1 đã kiểm chứng.
- GitHub API xác nhận main dbc806f, protected=false; PR #3 B đang mở vào nhánh nền A,
  chưa có review. PR #2 D đóng chưa merge, PR #1 đã merge. Không suy ra review từ trạng thái đóng.
- Môi trường chưa có gh/token/credential helper/browser GitHub. Có thể push SSH nhưng chưa
  tạo PR hoặc xác minh đủ review thành viên để merge theo CONTRIBUTING. Không đẩy thẳng main.
- Chưa merge hoặc xóa nhánh. Sau review/merge cần xử lý PR #3 trước khi xóa base;
  xác nhận B không dùng nhánh, giữ nhánh local A đã rebase cho đến khi đối chiếu xong.

Trạng thái hiện hành: xem [bàn giao 16/11](../docs/handoffs/a-acceptance-2026-11-16.md)
và mục cập nhật cuối file. Các bản ghi cũ là lịch sử tại thời điểm ghi, không tự thay đồng thuận nhóm.

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

## API UC02–03 bản đầu — 13/11/2026

- Dùng quy ước UC01 cho ID chuỗi, quyền Quản lý local và phản hồi lỗi. PATCH chỉ thay
  các trường được gửi. Giá VND dùng số nguyên theo phạm vi schema. FK thiếu đích trả
  `400 INVALID_REFERENCE`, SKU trùng trả `409 SKU_CONFLICT`.
- Hợp đồng bản đầu chờ C review. Quy tắc ngừng kinh doanh, ngừng sử dụng nhà cung cấp và
  tích hợp tạo dòng tồn ban đầu vẫn còn mở. [backend/README.md](../backend/README.md#uc0203--api-linh-kiện-và-nhà-cung-cấp)

## Lab Storage của A — 15/11/2026

- Nguồn: A yêu cầu làm lab Storage độc lập; nhánh experiment/a-storage-management kế thừa
  feat/uc02-03 tại 7038bb6, không đổi lịch sử remote A/B hoặc main.
- Fixture lab riêng: sản phẩm + thông số 1:1 trên MySQL, nhúng trên MongoDB; không đổi schema app.
- Đã chạy năm pha rỗng/1000/5000/mở rộng mô tả/xóa nửa dữ liệu; đối chiếu giá trị logic PASS.
- Lượt đầu stats MongoDB lấy ngay sau ghi chưa phản ánh cấp phát; bản chính thức thêm fsync
  bằng admin lab trước collStats, ghi điều kiện trong README. Không đo benchmark tốc độ.
- Bằng chứng: experiments/storage/results-initial.json và docs/report/3-2-storage.md.
- Trạng thái: bản đầu chạy trên một máy, chờ B review và tái tạo độc lập; không nghiệm thu
  toàn gói A, không thay test UC01/UI, không push/merge trong lượt này.

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


## Phương án actor và phân quyền F02 — A duyệt ngày 10/11/2026

- Nguồn: A duyệt các use case trong phiên làm việc, yêu cầu sửa F02 theo hai actor Quản lý và Nhân viên.
- Nhân viên: UC04 (tạo/xác nhận nhập), UC05–06 (tra cứu/lọc), UC07 (tạo/xác nhận bán), UC09–10 (lịch sử/cảnh báo).
- Quản lý: toàn bộ quyền Nhân viên, thêm UC01–03 (quản lý dữ liệu), UC08 (hủy), UC11 (doanh thu), UC12 (kiểm kê/điều chỉnh tồn).
- Phương án này không tách bước duyệt nhập hoặc duyệt kiểm kê sang người khác; không bổ sung actor Admin.
- Lý do: phân biệt công việc hằng ngày và quyền quản lý các thay đổi nhạy cảm trong phạm vi 12 UC hiện có.
- Ảnh hưởng: cập nhật actor từng đặc tả và sơ đồ; các task thiết kế/API/UI sau đó cần áp dụng cùng ma trận quyền.
- Trạng thái: A đã duyệt phương án F02; chưa có biên bản đồng thuận toàn nhóm, C review hoặc code phân quyền.
- Chi tiết trạng thái/hủy/doanh thu/kiểm kê còn theo dõi tại F03; không mặc định các lựa chọn kỹ thuật đã chốt.
- Tài liệu: [F02](../docs/architecture/use-cases.md), [sơ đồ](../docs/architecture/use-case-diagram.svg).

## Hoàn thiện A và ghép bản review — 15–16/11/2026

- Nguồn: A giao hoàn thiện mọi phần việc có thể làm của A và quản lý Git/bàn giao;
  sau đó đồng ý cài React/Vite. Không yêu cầu làm thay UC/lab của B–E hoặc tự nghiệm thu.
- Triển khai: React 19.3.1, Vite 8.3.8, CSS thuần; Playwright 1.61.1 kiểm thử Chromium.
  Component UC01 độc lập để C ghép shell. Đây là lựa chọn triển khai của A trong phiên,
  không ghi nhận C hoặc toàn nhóm đã duyệt khung UI. Figma không chặn trang UC01.
- Quyền: tiếp tục token Quản lý local, chỉ giữ trong bộ nhớ trang; cần thống nhất nhận diện/
  phiên/hai actor với C và owner trước khi nghiệm thu quyền. Không tự thêm Admin hoặc bảng user.
- Kiểm chứng: 11 backend test, integration UC01/UC02–03, 5 browser test MySQL lab và build đạt.
  Test tái hiện rồi sửa lỗi ID sắp kiểu chuỗi và mất focus modal. Không đổi migration app.
- Git: lab 7a263bc, UC01 a3fcd35/d901fde/4b69031 trên nhánh task riêng đã push;
  integration/a-sprint2-review ghép F02 229aa11, Nam 6729842, giữ lịch sử và cả nhật ký A/B/D.
  Không merge main, force-push lịch sử A/B cũ, đổi protection hoặc xóa nhánh.
- Thiết kế/báo cáo: ghép ERD những miền có đầu vào; D/E vẫn là nháp/chưa đủ DDL.
  Có báo cáo tổng hợp bản đầu và demo A; không bịa chương lab C/D/E hoặc PDF/ZIP cuối.
- Tiến độ: mốc 15/11 chưa đạt. Cập nhật ngày 16/11 là phần tồn Sprint 1–2, không tự dời hạn.
  B review A, C rà F02/UI/API/B, E tái tạo/restore và review D theo plan; chưa có xác nhận từ họ.
- Giới hạn: UI test fixture bị dừng trước khi lắng nghe có thể sót schema lab ngẫu nhiên;
  đã ghi README. Migration runner của B chưa xác minh schema drift, đã chuyển vào checklist review B.
- PR/comment đã soạn trong bàn giao, chưa đăng vì môi trường chưa có gh/token/browser GitHub.
  Review kỹ thuật bằng trợ lý không thay review thành viên hoặc nghiệm thu nhóm.
- Kiểm tra cuối 16/11: backend/build đạt; browser bị ECONNREFUSED do mysql-lab dừng,
  khởi động riêng lab và chạy lại 5/5 đạt. Không sửa code, credential hoặc dữ liệu app vì lỗi này.

## Triển khai thử UC05–06/11 của C — 16/11/2026

- Nguồn: Khánh yêu cầu hoàn thành gói C trên nền remote main, dùng đầu ra A/B/D/E.
- Đề xuất tra cứu mã chính xác hoặc tên chứa từ khóa, chỉ hiện sản phẩm ACTIVE,
  lọc tồn theo dương hoặc bằng 0. Tồn chưa có được biểu diễn bằng null.
- Đề xuất dùng phương án A của F03 cho doanh thu, lấy đơn đang CONFIRMED và
  biên ngày [from, to) theo giờ nghiệp vụ Việt Nam. Đơn tháng 11 hủy tháng 12
  làm giảm doanh thu tháng 11. A/C/D cần xác nhận trước nghiệm thu.
- Token nhân viên local riêng mở UC05–06, giữ token quản lý hiện tại cho UC11.
  A và các miền vẫn cần chốt cơ chế phiên chung.
- Kiểm tra trên migration A/B và fixture kho/bán tách riêng trong MySQL lab.
  Chờ bảng thật của D/E và review A. Xem [hợp đồng C](../docs/architecture/api-contract.md)
  và [bàn giao](../docs/handoffs/c-sprint1-2.md).

## Đề xuất pilot bảng tiến độ trong Git — 16/11/2026

- Khánh đề xuất dùng một trang HTML tĩnh để xem tiến độ A–E. Mỗi người sửa một file
  trong `docs/status/` và cập nhật theo luồng Git/PR đang dùng.
- Bản pilot lấy từ bàn giao A/C, tài liệu B/D và kết quả lab E. Một số tài liệu A vẫn mô tả
  thời điểm trước merge và trước kết quả E. Pilot dùng lịch sử Git và báo cáo lab E mới hơn
  để ghi hiện trạng, giữ nguyên tiêu chí nghiệm thu trong plan.
- Nhóm thử một lượt cập nhật theo gói trong Sprint 3 rồi chốt có dùng bảng cho các đợt sau.
  Trạng thái hiện tại là đề xuất đang thử. Xem [cách cập nhật](../CONTRIBUTING.md#pilot-bảng-tiến-độ).

## UC10 · Ngưỡng tồn theo linh kiện

Đạt xác nhận đã thống nhất với nhóm. Dùng `inventory.low_threshold`, số nguyên không âm, mặc định NULL cho cả dòng tồn đã có và dòng mới. NULL biểu thị chưa cấu hình. 0 là ngưỡng hợp lệ. Cảnh báo khi tồn nhỏ hơn ngưỡng. Nhân viên và Quản lý được xem. Chỉ Quản lý được đặt, đổi hoặc bỏ ngưỡng. Chỉnh ngưỡng giữ nguyên số lượng tồn và sổ biến động. Quyết định này chốt phần UC10 của Q05.
