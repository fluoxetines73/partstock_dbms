# Kế hoạch thực hiện và bàn giao PartStock

Cập nhật **11/11/2026** theo phương án người dùng duyệt. Hiện là **Sprint 2 (09–15/11)**.
Hoàn tất phần còn thiếu của Sprint 1 và toàn bộ Sprint 2 **chậm nhất Chủ nhật 15/11/2026,
trước thứ Hai 16/11**. Hạn nộp vẫn là **30/11/2026, giờ LMS**; A xác nhận giờ cụ thể.

## 1. Phạm vi và tiến độ thực tế

Giữ nguyên [yêu cầu](requirements.md) và [phân công](ownership.md): 12 UC, 8 dạng thao tác,
5 chủ đề trên cả MySQL và MongoDB, cùng backup/restore bổ sung. Ứng dụng chỉ dùng MySQL;
MongoDB phục vụ lab, không xây ứng dụng thứ hai hoặc đồng bộ hai hệ.

Rà repo ngày 11/11:

- Đã có Docker local và script kiểm tra hạ tầng; [KIEM-TRA.md](../KIEM-TRA.md) ghi kết quả
  trên một máy. Chưa có bằng chứng tái tạo trên máy thứ hai; không chạy lại Docker trong lần rà này.
- Có bản nháp F03 quy tắc chứng từ/kho và F04 ERD miền D tại commit `daf1f1e`, nhánh
  `docs/f03-f04-inventory-transactions`. Hai file `docs/architecture/f03-quy-tac-chung-tu-kho.md`
  và `docs/architecture/f04-erd-mien-d.md` chưa nằm trên main tại lần rà này, chưa được chốt.
  D cung cấp bản nháp để kế thừa khi hợp nhất thiết kế; không tự coi đã review hoặc merge.
- Frontend/backend, schema/model/seed nghiệp vụ và thực nghiệm chuyên đề chưa có triển khai
  trong bản đang rà; chưa có lệnh test ứng dụng. Kiểm tra transaction hạ tầng không thay kết quả lab chuyên đề.
- Đây là bằng chứng trong repo, không kết luận về công việc đang làm ngoài repo.

Lịch dưới là mục tiêu đã được người dùng duyệt, không phải xác nhận nhận việc hoặc nghiệm thu
của toàn nhóm. Quyết định schema/API/công nghệ/nghiệp vụ còn mở vẫn phải được xác nhận trong
[sổ quyết định](../agent/decisions.md).

## 2. Năm gói công việc xuyên suốt

Mỗi người tự tổ chức thiết kế chi tiết, UI–API–DB, kiểm thử, thực nghiệm, báo cáo và demo của mình.
Plan chung theo dõi gói lớn; không bắt buộc chia từng bước nhỏ thành việc phối hợp nhiều người.
Đầu mối hợp nhất nhận đầu ra, không làm thay tất cả các miền.

| Gói / người | Ứng dụng MySQL | Thực nghiệm trên cả hai hệ | Trách nhiệm chung | Reviewer chính |
|---|---|---|---|---|
| A — Đạt | UC01: danh mục, thương hiệu | Storage & management | Điều phối phạm vi/thiết kế, hợp nhất ERD, khung backend, tích hợp, ghép báo cáo, đóng gói/nộp | B |
| B — Tuấn | UC02–03: linh kiện, thông số, giá bán, nhà cung cấp | Indexing | Môi trường, hợp nhất migration/model lab, seed, cách chạy lab, backup/restore | C |
| C — Khánh | UC05–06–11: tìm kiếm, lọc, doanh thu | Query processing | Khung UI/mock, hợp nhất API docs, đối chiếu 8 dạng thao tác | A |
| D — Nam | UC04–07–08: nhập, bán, hủy | Transaction | Giao dịch chứng từ–tồn–biến động, rollback, chống tác động lặp | E |
| E — Hải | UC09–10–12: lịch sử, cảnh báo, kiểm kê | Concurrency control | Kiểm thử tích hợp/đồng thời, xác minh máy thứ hai, restore và ZIP | D |

Mỗi gói bàn giao code/script, đầu vào, hướng dẫn chạy, kết quả kiểm tra, phần báo cáo và kịch bản demo.
E vẫn trực tiếp kiểm chứng restore của B và ZIP của A. Nếu reviewer cùng viết một phần,
phần đó cần người khác review. Code A cũng cần review; không ghi nhận review khi chưa thực hiện.

## 3. Phụ thuộc và cách làm song song

**Không hoàn toàn song song từ đầu.** Sau khi bàn giao cấu trúc dữ liệu, quy tắc và khung chung,
các module có thể triển khai độc lập bằng seed/mock. Nghiệm thu cuối vẫn cần tích hợp thật.

| Người | Đầu vào bắt buộc / người cung cấp | Cách tiếp tục độc lập | Phụ thuộc khi nghiệm thu |
|---|---|---|---|
| A | Thiết kế miền B/D/E, nhu cầu truy vấn C để hợp nhất ERD | Tự làm UC01, backend và lab storage | Module và báo cáo của cả nhóm để ghép bản chung |
| B | Cấu trúc danh mục/thương hiệu A; quy ước sản phẩm–tồn D/E; model các miền để hợp nhất seed/migration | Dùng danh mục mẫu, không chờ UI của A; tự làm indexing và backup/restore | E kiểm chứng restore; các miền khớp migration/seed chung |
| C | Cấu trúc sản phẩm B, tồn D/E, đơn bán D và quy tắc doanh thu sau hủy | Dùng sản phẩm/đơn bán mẫu; không chờ CRUD hoặc UI B/D/E | Doanh thu khớp đơn thật từ D và dữ liệu bản chung |
| D | Cấu trúc sản phẩm/nhà cung cấp B; cơ chế kho thống nhất với E | Dùng dữ liệu mẫu; không chờ B hoàn thành CRUD | E review tương tác kho/kiểm kê và giao dịch đồng thời |
| E | Cấu trúc sản phẩm B; cơ chế kho/chứng từ thống nhất với D | Dùng tồn/biến động mẫu để làm lịch sử, cảnh báo, kiểm kê và lab | App tích hợp để kiểm thử; script backup/restore của B |

Ba phần dùng chung cần bàn giao sớm:

- **Thiết kế và giao diện module:** A hợp nhất ERD/use case và khung backend; C hợp nhất API
  và khung UI. Mỗi owner cung cấp cấu trúc/API miền mình, không chờ người khác viết thay.
- **Database và dữ liệu mẫu:** B hợp nhất migration/model/seed, môi trường và cơ chế chạy lab.
  Mỗi người tự bổ sung dữ liệu tình huống theo cấu trúc chung, không chờ B cho từng ca thử.
  E xác minh môi trường máy thứ hai; B–D rà điều kiện transaction MongoDB.
- **Kho và chứng từ:** D–E thống nhất một cơ chế cập nhật kho/ghi biến động và giao diện phần dùng chung;
  C đối chiếu doanh thu, A điều phối chốt. Kế thừa F03/F04, xác định người hiện thực phần dùng chung
  ngay khi chốt thiết kế. E không chờ D hoàn thành toàn bộ bán hàng mới bắt đầu module mình.

Phụ thuộc cấu trúc không có nghĩa phải chờ chức năng hoàn thiện. D–E không triển khai hai cơ chế
kho khác nhau. Đổi schema/API/quy tắc chung phải báo người bị ảnh hưởng, cập nhật tài liệu/quyết định
và kiểm tra tích hợp; không tự thay đổi hợp đồng trong thời gian người khác đang triển khai.

Lab chạy trên môi trường riêng từng người, không chờ UI/API ứng dụng. Dùng cùng dữ liệu nghiệp vụ
logic và quy ước đo; model hai hệ có thể khác nhưng phải giải thích. App/lab tách kết nối,
cấu hình, credential/quyền; reset và giả lập mất dữ liệu chỉ trên lab đã xác minh.

## 4. Sprint theo tuần và hạn gấp rút

| Sprint | Mục tiêu | Đầu ra |
|---|---|---|
| Sprint 1 — 04–08/11, phần tồn chuyển xử lý trong Sprint 2 | Môi trường và nền tảng thiết kế/triển khai | Không hồi tố đánh dấu hoàn tất; phần còn thiếu phải đạt cùng Sprint 2 |
| **Sprint 2 — 09–15/11, hiện tại** | Hoàn tất nền, đủ chức năng và thực nghiệm, review/tích hợp | **Đủ 12 UC, 8 thao tác, 5 chủ đề hai hệ, backup/restore kiểm chứng và báo cáo bản đầu trước 16/11** |
| Sprint 3 — 16–22/11 | Hoàn thiện sau nghiệm thu | Sửa lỗi, ổn định app, kiểm chứng lại kết quả, hoàn thiện phân tích/báo cáo; không chủ động để chức năng bắt buộc sang sprint này |
| Sprint 4 — 23–29/11 | Hoàn thiện bản nộp | Hướng dẫn/demo/báo cáo đầy đủ, kiểm tra ZIP và dự phòng |
| 30/11 | Nộp bài | A nộp trước giờ LMS, kiểm tra tệp và lưu xác nhận |

### Các điểm bàn giao còn lại của Sprint 2

| Hạn tháng 11/2026 | Đầu ra | Người phụ trách / điểm phụ thuộc |
|---|---|---|
| **11/11** | Xác nhận cấu trúc dữ liệu/API dùng chung, quy tắc kho/hủy/doanh thu và lựa chọn công nghệ cần để triển khai | A điều phối; owner cung cấp miền mình, C hợp nhất API; D–E thống nhất kho. A xác nhận giờ LMS/thời lượng trình bày và phần việc thực tế |
| **12/11** | Khung app, migration/model, seed tối thiểu, quy ước lab và môi trường máy thứ hai dùng được | A backend, C UI, B database/seed/môi trường; D/E phần miền mình, E xác minh. Đây là nền để làm song song |
| **13/11** | Bản đầu chạy được của nhóm chức năng mỗi người; lab có kịch bản chạy trên cả hai hệ | Owner bàn giao; A bắt đầu ghép, reviewer nhận phần sẵn sàng |
| **14/11** | Gói cá nhân đủ chức năng, script/kết quả lab, hướng dẫn, báo cáo và demo phần mình | Mỗi người hoàn thiện; review chéo song song, không chờ tất cả cùng xong |
| **15/11** | Sửa lỗi review, kiểm tra bản tích hợp, nghiệm thu phần tồn Sprint 1 và toàn bộ Sprint 2 | A tích hợp/ghép báo cáo; E kiểm thử/restore; C đối chiếu 8 thao tác; từng owner sửa phần mình |

Mốc 12/11 cần nền tối thiểu đã kiểm chứng, không yêu cầu hoàn thiện mọi tài liệu trước khi làm
phần độc lập. Không để ngày 15/11 mới bàn giao code lần đầu. Người viết tiếp tục phần độc lập
trong khi reviewer kiểm tra đầu ra đã có, không chờ review từng thao tác nhỏ.

Đến 14/11: A đủ UC01/storage/backend; B đủ UC02–03/indexing/database/backup-restore;
C đủ UC05–06–11/query/UI và đối chiếu thao tác; D đủ UC04–07–08/transaction;
E đủ UC09–10–12/concurrency và bộ kiểm tra. Đến 15/11 các phần này phải chạy trên bản chung,
được review và có bằng chứng, không chỉ chạy riêng trên máy cá nhân.

## 5. Nghiệm thu và theo dõi gói việc

Theo dõi mỗi gói: **Đang làm → Đã bàn giao → Cần sửa (nếu có) → Đã nghiệm thu**.
Ghi owner/reviewer, hạn, đầu ra, phụ thuộc/người cung cấp, kết quả kiểm tra và phần còn thiếu.
Việc chưa bắt đầu ghi rõ chưa bắt đầu; bị chặn giữ trạng thái thực tế và bổ sung lý do.
Không bắt buộc lịch họp hoặc báo cáo từng task nhỏ; cập nhật khi bàn giao, có kết quả review
hoặc phát sinh vấn đề chặn người khác. Chưa họp/review thì không tạo bằng chứng giả.

Điều kiện hoàn tất Sprint 1–2:

- App tích hợp đủ 12 UC và 8 dạng thao tác; C đối chiếu, mỗi owner cung cấp bằng chứng.
- E kiểm tra bản chung: nháp không đổi kho; không bán vượt tồn; xác nhận/hủy không tác động lặp;
  lỗi giữa chừng rollback; tranh chấp tồn cuối; lịch sử khớp tồn; kiểm kê có lý do; giá giao dịch
  giữ nguyên khi giá sản phẩm đổi; doanh thu và xóa/ngừng kinh doanh đúng quy tắc đã chốt.
- Mỗi chủ đề hai hệ có script, seed/đầu vào, phiên bản/cấu hình/topology, quy mô/index,
  điều kiện cache, số lần chạy/cách tổng hợp, kết quả và giải thích cơ chế; ghi lỗi và giới hạn.
  Không bịa benchmark hoặc kết luận từ số đo chưa kiểm chứng.
- Backup/restore hai hệ được B thực hiện, E khôi phục vào DB lab sạch và đối chiếu độc lập.
- Mỗi người có phần báo cáo/demo và hướng dẫn chạy lại; A ghép báo cáo bản đầu.
- Đầu ra được người khác review và nằm trong bản chung. Seed/mock hỗ trợ triển khai,
  không thay nghiệm thu giao dịch thật giữa các module. Chưa có lệnh test app thì ghi chưa thiết lập.

Mốc 15/11 rất gấp so với hiện trạng chưa có code nghiệp vụ. Nếu nền ngày 12/11 hoặc bản đầu
ngày 13/11 trễ, owner báo ngay A và người nhận: thiếu gì, ảnh hưởng gói nào, dự kiến xử lý lúc nào.
A tổng hợp rủi ro; ưu tiên tính đúng dữ liệu và đầu ra bắt buộc, giảm trang trí/mở rộng.
Không tự dời hạn, bỏ yêu cầu, đổi phân công hoặc đánh dấu Done để giữ lịch trên giấy.

## 6. Hoàn thiện và nộp bài

Sprint 3 dành cho lỗi sau nghiệm thu và chất lượng báo cáo/kết quả. Nếu còn đầu ra bắt buộc chưa
đạt ngày 15/11, ghi rõ là trễ Sprint 1–2 và có kế hoạch khắc phục, không đổi thành việc mới Sprint 3.

| Hạn | Đầu ra | Phụ trách / kiểm tra |
|---|---|---|
| 22/11 | App ổn định hơn, kết quả được rà lại, phân tích và báo cáo hoàn thiện | Owner sửa phần mình; reviewer kiểm tra, A hợp nhất |
| 24/11 | Báo cáo/hướng dẫn/kịch bản demo đầy đủ; chạy từ checkout và DB kiểm thử sạch | A ghép báo cáo/demo, B hướng dẫn, C rà cấu trúc, E chạy độc lập; owner bổ sung phần mình |
| 25–27/11 | Kiểm chứng demo và trình bày, sửa lỗi; xác minh đúng bản dự kiến nộp | Mỗi người trình bày được cơ chế/kết quả/giới hạn phần mình; A hợp nhất, E rà kiểm chứng |
| 28/11 | ZIP có thể giải nén và chạy theo hướng dẫn | A đóng gói, E kiểm tra độc lập |
| 29/11 | Dự phòng, hồi quy và đóng băng bản cuối | Owner sửa lỗi cần thiết; A đóng gói lại, E xác minh nếu bản thay đổi |
| 30/11 | Nộp trước giờ LMS và lưu xác nhận | A nộp, E đối chiếu đúng bản đã kiểm tra |

ZIP gồm PDF có tham khảo, mã nguồn, schema/migration/model, generator/seed tái tạo,
script/demo hai hệ, hướng dẫn, kết quả/phân tích, đóng góp và bằng chứng teamwork thật.
Không đưa credential, volume, dependency, backup/dump hoặc dữ liệu lớn không cần thiết vào ZIP.
Giữ 28–29/11 làm dự phòng; ngày 30/11 không dự kiến viết chức năng hoặc ghép báo cáo lần đầu.

Các mã F01–F14, APP/LAB/QA/DOC/REL trong tài liệu cũ là tham chiếu lịch sử. Trách nhiệm và
đầu ra tương ứng được gom vào các gói/mốc ở trên, không còn là chuỗi task nhỏ bắt buộc.
