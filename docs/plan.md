# Kế hoạch thực hiện và bàn giao PartStock

Cập nhật **09/11/2026** theo phương án được người dùng duyệt trong phiên làm việc.
Hạn nộp cố định: **30/11/2026, giờ cụ thể theo LMS**. A xác nhận giờ LMS và thông báo
cho nhóm khi rà kế hoạch; không mặc định hạn là cuối ngày.

Mục tiêu nội bộ: **22/11 đủ chức năng và thực nghiệm; 25/11 dợt toàn bộ lần 1;
27/11 tổng duyệt; 28/11 kiểm tra ZIP; 29/11 đóng băng; 30/11 nộp bài**.
Đây là các mục tiêu công việc, không phải bằng chứng hoàn thành hoặc giờ công đã được
thành viên xác nhận. Chưa có biên bản đồng thuận toàn nhóm.

## 1. Phạm vi, hiện trạng và cách dùng kế hoạch

- [Yêu cầu](requirements.md) là nguồn phạm vi/nghiệp vụ/rubric; giữ mục tiêu 12 UC,
  8 dạng thao tác và 5 chủ đề trên cả MySQL/MongoDB. Backup/restore là phần bổ sung đã lên kế hoạch.
- [Ownership](ownership.md) là nguồn trách nhiệm A–E; mỗi người làm UI–API–DB và báo cáo/demo
  phần mình. Owner điều phối bàn giao, không độc quyền sửa file.
- [Sổ quyết định](../agent/decisions.md) phân biệt đã chốt/còn mở. Duyệt kế hoạch không đồng
  nghĩa đã chọn schema, API, ORM hay quy tắc hủy/doanh thu.
- Hiện có môi trường Docker kiểm chứng trên một máy, chờ review và máy thứ hai xác minh;
  chưa có app/schema/seed nghiệp vụ hoặc lệnh test ứng dụng. Xem [KIEM-TRA.md](../KIEM-TRA.md).
- Kế hoạch gốc bắt đầu 04/11, dự kiến chốt thiết kế 06/11 và review 08/11. Chưa có bằng chứng
  hoàn thành các mốc đó trong tài liệu; không ghi hồi tố đã xong. Phần nền tảng chưa hoàn thành
  được bố trí lại vào 09–12/11.

Tổ chức theo Agile, tham khảo Scrum: mục tiêu tuần, backlog có thứ tự, review bản chạy được
và điều chỉnh theo bằng chứng; không tuyên bố thực hiện đầy đủ Scrum. Nhịp còn lại: S2 09–15/11,
S3 16–22/11, S4 23–27/11; 28–30/11 đóng gói, dự phòng và nộp. S4 là đợt hoàn thiện ngắn theo deadline.

Các bảng là backlog kế hoạch ban đầu. Khi nhận việc, A và owner tạo/cập nhật thẻ trên board
nhóm chọn, ghi trạng thái và bằng chứng; chưa ghi nhận board đã được tạo. Task lớn tách nhỏ
trước khi đưa Ready, giữ liên kết với mã nhóm công việc ở đây.

## 2. Mốc và điều kiện nghiệm thu

| Thời gian | Mục tiêu | Đầu ra cần kiểm tra |
|---|---|---|
| 09–10/11 | Chốt thiết kế nền tảng | Use case, quy tắc kho/hủy/doanh thu, ERD và từ điển dữ liệu, API bản đầu; lựa chọn công nghệ được ghi nhận |
| 11–12/11 | Có nền để triển khai song song | Migration MySQL, model MongoDB lab, seed nhỏ, khung frontend/backend, kết nối DB; môi trường được tái tạo trên máy thứ hai |
| 13–15/11 | Một luồng nghiệp vụ xuyên suốt | Bản chung chạy sản phẩm → nhập → bán → xem tồn/lịch sử; từng chủ đề có kịch bản bước đầu chạy trên hai hệ |
| 16–19/11 | Hoàn thiện chức năng | Hủy đơn, tìm/lọc, cảnh báo, kiểm kê, doanh thu; lỗi giữa chừng và thao tác lặp |
| 20–22/11 | Nghiệm thu phạm vi | Đủ 12 UC, 8 dạng thao tác, kiểm thử tích hợp/đồng thời; đủ kết quả 5 chủ đề trên hai hệ; backup/restore được kiểm chứng; báo cáo bản đầu |
| 23–24/11 | Có bản trình bày đầy đủ | Báo cáo đầy đủ, kịch bản demo chung, hướng dẫn; chạy từ checkout và DB sạch, tách đúng app/lab |
| 25/11 | Dợt toàn bộ lần 1, trước hạn 5 ngày | Mỗi người trình bày; chạy app và thực nghiệm; ghi lỗi, thời lượng, thiếu bằng chứng và câu hỏi chưa trả lời được |
| 26/11 | Sửa sau dợt | Sửa lỗi ưu tiên cao, bổ sung bằng chứng, chỉnh báo cáo và kịch bản |
| 27/11 | Tổng duyệt, trước hạn 3 ngày | Dùng đúng phiên bản dự kiến nộp; chạy lại kịch bản, xác minh lỗi buổi đầu đã được xử lý |
| 28/11 | Kiểm tra ZIP | A đóng gói, E kiểm tra độc lập; giải nén và làm theo hướng dẫn, đối chiếu đủ thành phần nộp |
| 29/11 | Dự phòng và đóng băng | Chỉ sửa lỗi cần thiết, hồi quy phần bị ảnh hưởng; A/E xác nhận lại nếu ZIP thay đổi |
| 30/11 | Nộp bài | A nộp trước giờ LMS với khoảng đệm nhóm thống nhất, kiểm tra tệp đã tải lên và lưu xác nhận |

## 3. Backlog nền tảng 09–12/11

“Phụ thuộc” là đầu vào cần được review trước khi hoàn tất đầu ra; có thể chuẩn bị bản nháp sớm.
Hạn ghi theo tháng 11/2026. Reviewer là người được giao kiểm tra, chưa phải đã review.
Nếu reviewer cùng viết một phần, cần người khác review phần đó theo [CONTRIBUTING.md](../CONTRIBUTING.md).

| Mã | Công việc và đầu ra | Thực hiện | Review/phối hợp | Phụ thuộc | Hạn |
|---|---|---|---|---|---|
| F01 | Rà việc đã làm, khả năng tham gia, backlog; xác nhận giờ LMS và thời lượng trình bày | A; mỗi người báo khả năng thực tế | E rà bằng chứng | Hiện trạng repo, yêu cầu môn | 09/11 |
| F02 | Sơ đồ đủ 12 UC, actor, luồng chính và ngoại lệ cốt lõi | A; owner góp UC của mình | C | Requirements | 10/11 |
| F03 | Quy tắc trạng thái, hủy/doanh thu, cập nhật kho, chống lặp và kiểm kê khi có giao dịch | D soạn cùng E | C rà doanh thu; A điều phối nhóm chốt | Requirements | 10/11 |
| F04 | ERD MySQL và từ điển dữ liệu: quan hệ, khóa, kiểu dữ liệu, tiền/số lượng, giá lịch sử, trạng thái | A hợp nhất; B/D/E thiết kế miền phụ trách | C rà truy vấn; B rà tổng thể, phần B do D review | F02, F03 | 10/11 |
| F05 | Chốt runtime, UI library, DB/ORM, cấu hình và quy ước lệnh | A điều phối; B/C/D góp lựa chọn | E rà tái tạo; nhóm thống nhất | Định hướng stack, môi trường hiện có | 10/11 |
| F06 | API: endpoint, request/response, trạng thái, mã lỗi, quy ước ngày/tiền và mock | Mỗi owner viết API UC mình; C hợp nhất | A rà chung; D–E rà API kho | F03, F04 bản đầu | 10/11 |
| F07 | Migration MySQL có thứ tự và ràng buộc; hướng dẫn áp dụng/phục hồi phù hợp | Mỗi owner viết miền mình; B hợp nhất | E rà ràng buộc; D rà giao dịch | F04, F05 | 12/11 |
| F08 | Model MongoDB lab: embed/reference, validation/index, khác biệt với MySQL | B hợp nhất; mỗi owner góp nhu cầu lab | A rà lưu trữ; D–E rà transaction/đồng thời | F03, F04; cấu hình hỗ trợ transaction | 12/11 |
| F09 | Khung backend: khởi động, cấu hình, kết nối MySQL app, xử lý lỗi chung, hướng dẫn chạy | A | D | F05; quy ước F06 | 12/11 |
| F10 | Khung frontend: điều hướng, gọi API, hiển thị lỗi/trạng thái, mock theo hợp đồng | C | B | F05, F06 | 12/11 |
| F11 | Seed nhỏ hai hệ, đối chiếu số lượng/tồn/tổng tiền; mock khớp dữ liệu; cách nạp/reset lab | B làm seed; C làm mock; owner góp tình huống | E đối chiếu | F06, F07, F08 | 12/11 |
| F12 | Tái tạo môi trường máy thứ hai, xác minh tách app/lab và quyền; B–D rà transaction MongoDB | E chạy; B hỗ trợ | A rà bằng chứng; D rà transaction | Bộ setup local hiện có | 12/11 |
| F13 | Ma trận UC/quy tắc → đầu vào → kết quả mong đợi → owner → bằng chứng | E; owner góp tình huống | D; C đối chiếu 8 thao tác | F02, F03, F06 | 12/11 |
| F14 | Quy ước lab: cấu hình, baseline/reset, số lần đo/cache, cách tổng hợp, lưu log/kết quả | B chuẩn bị cơ chế chung; A hợp nhất phương pháp | C rà đo/truy vấn; E rà tái tạo | F08, F11; README thực nghiệm | 12/11 |

Đầu ra thiết kế lưu tại [docs/architecture](architecture/README.md); schema/migration/model/seed
ở [database](../database/README.md); quy tắc đã thống nhất ghi vào sổ quyết định.
Khung app ở [frontend](../frontend/README.md), [backend](../backend/README.md);
kịch bản và bằng chứng lab ở [experiments](../experiments/README.md).
Tên file chi tiết và lệnh thật được ghi vào task khi triển khai; không ghi lệnh giả là chạy được.

### Điều kiện qua mốc 12/11

- Thiết kế được review; API/schema cùng diễn đạt quy tắc nghiệp vụ; chỉ rõ quyết định còn mở.
- Migration chạy được trên DB kiểm thử trống, ràng buộc đúng thiết kế; seed có số liệu đối chiếu.
- Khung frontend/backend khởi động theo hướng dẫn, backend kết nối đúng MySQL app.
- Máy thứ hai tái tạo được môi trường với credential riêng và bằng chứng thật.
- Bàn giao hợp đồng để người khác triển khai; không nghiệm thu chỉ vì đã có file.

## 4. Thứ tự triển khai và làm song song

Chuỗi phụ thuộc chính:

1. Quy tắc nghiệp vụ → ERD/từ điển dữ liệu → schema và hợp đồng API.
2. Schema/API + khung app → seed/mock → các chức năng phát triển độc lập.
3. Sản phẩm/nhà cung cấp → nhập/bán → lịch sử/tồn → hủy/kiểm kê/doanh thu theo quy tắc đã chốt.
4. Tích hợp → kiểm thử nghiệp vụ/đồng thời → nghiệm thu bằng chứng → dợt và đóng gói.

Phụ thuộc tích hợp không có nghĩa phải đợi xong toàn bộ UI của người trước:

- C làm UI bằng mock khi hợp đồng đã review; thay bằng API thật trước nghiệm thu.
- D làm nhập/bán trên seed, không phải đợi UI quản lý sản phẩm của B.
- E chuẩn bị lịch sử/tồn và kiểm thử từ schema, ghép với D khi API nhập/bán sẵn sàng.
- C làm doanh thu sau khi chốt trạng thái và giá giao dịch, dùng seed trước khi có đơn thực tế.
- Mỗi người chuẩn bị kịch bản lab ngay; chạy khi dữ liệu/model liên quan sẵn sàng.
  Đo chính thức theo điều kiện đã ghi nhận, không lấy số đo tạm làm kết luận cuối.

Đổi schema/API phải cập nhật hợp đồng và quyết định, nêu task bị ảnh hưởng, báo owner phụ thuộc
và kiểm tra lại tích hợp. D–E dùng một cơ chế cập nhật chứng từ–tồn–biến động thống nhất.

## 5. Phân công triển khai 13–22/11

Các dòng dưới là nhóm công việc; owner tách thành thẻ nhỏ theo UC/kịch bản khi đưa Ready,
giữ mã nhóm, phụ thuộc cụ thể, reviewer, hạn và tiêu chí kiểm tra.

| Nhóm / owner | 13–15/11: bản cơ bản | 16–19/11: hoàn thiện | 20–22/11: nghiệm thu | Reviewer chính |
|---|---|---|---|---|
| APP-A / A — Đạt | UC01; tích hợp khung và bản chung | Hoàn thiện UC01, gỡ vướng mắc tích hợp | Rà phạm vi; ghép báo cáo bản đầu | B rà UC01; D rà backend chung |
| APP-B / B — Tuấn | UC02–03; seed cho nhập/bán/tìm kiếm | Hoàn thiện sản phẩm, thông số, giá, nhà cung cấp | Sửa lỗi dữ liệu, hướng dẫn tái tạo | A |
| APP-C / C — Khánh | UC05–06 cơ bản trên API thật; ghép UI | Hoàn thiện UC05–06–11, doanh thu theo quy tắc | Đối chiếu truy vấn/doanh thu và 8 thao tác | B rà tìm/lọc; D rà doanh thu |
| APP-D / D — Nam | UC04–07: nhập/bán có transaction | UC08; chống xác nhận/hủy lặp; lỗi giữa chừng | Kiểm chứng trạng thái, rollback, nhất quán kho | E |
| APP-E / E — Hải | UC09: lịch sử và đối chiếu tồn | UC10–12: cảnh báo/kiểm kê; test đồng thời | Kiểm thử bản chung, bất biến kho và cạnh tranh | D |

Ngày 15/11, A điều phối demo **sản phẩm → nhập → bán → tồn/lịch sử** trên cùng bản ứng dụng,
E đối chiếu dữ liệu trước/sau, từng owner sửa phần mình. Mock hoặc demo module rời không đủ
nghiệm thu tích hợp. UC08 hoàn thiện theo mốc 19/11 của kế hoạch cập nhật.

### Thực nghiệm, kiểm thử và báo cáo chạy song song

| Mã / đầu ra | Owner | Reviewer | Phụ thuộc | Mốc bàn giao |
|---|---|---|---|---|
| LAB-A — Storage hai hệ: metadata, data/index size, giải thích tổ chức lưu trữ | A | B | F08, F11, F14 | 15/11 chạy bước đầu; 19/11 đủ kịch bản; 22/11 đủ kết quả/phân tích |
| LAB-B — Indexing hai hệ: trước/sau index, kế hoạch, số quét, chi phí đọc/ghi | B | C | F08, F11, F14 | 15/11 bước đầu; 19/11 đủ kịch bản; 22/11 đủ kết quả/phân tích |
| LAB-C — Query processing hai hệ: kế hoạch thực thi, truy vấn tương đương và đối chiếu kết quả | C | A | F08, F11, F14; quy tắc doanh thu | 15/11 bước đầu; 19/11 đủ kịch bản; 22/11 đủ kết quả/phân tích |
| LAB-D — Transaction hai hệ: commit/rollback, lỗi giữa chừng và bất biến | D | E | F03, F08, F11, F12, F14 | 15/11 bước đầu; 19/11 đủ kịch bản; 22/11 đủ kết quả/phân tích |
| LAB-E — Concurrency hai hệ: tranh chấp tồn cuối, lịch xen kẽ và kết quả | E | D | F03, F08, F11, F12, F14 | 15/11 bước đầu; 19/11 đủ kịch bản; 22/11 đủ kết quả/phân tích |
| LAB-R — Backup/restore hai hệ, khôi phục DB sạch và đối chiếu độc lập | B | E trực tiếp xác minh | F11, F12, F14 | 19/11 chạy được; 22/11 kiểm chứng xong |
| QA-01 — Kiểm thử tích hợp/đồng thời trên bản chung | E; owner chạy/sửa phần mình | D; phần D viết do E review | F13, APP-A đến APP-E | 15/11 luồng cơ bản; 22/11 đủ tình huống |
| QA-02 — Bằng chứng 12 UC và 8 dạng thao tác trong requirements | C điều phối; owner cung cấp | A | APP-A đến APP-E, QA-01 | 22/11 |
| DOC-01 — Báo cáo từng người, có trích dẫn và bằng chứng | A–E theo chủ đề/UC; A ghép | Reviewer LAB tương ứng; C rà tổng thể | Kết quả app/lab đã kiểm chứng | Viết khi có kết quả; 22/11 bản đầu; 24/11 bản đầy đủ |

Mỗi kết quả lab kèm script, đầu vào/seed, phiên bản/cấu hình/topology, quy mô/index,
điều kiện cache, số lần chạy và cách tổng hợp khi đo; ghi cả lần lỗi và giới hạn.
Không chỉ đưa thời gian hoặc ERD thay bằng chứng cơ chế. Cùng dữ liệu nghiệp vụ logic trên hai hệ,
ghi rõ khác biệt model; không xây app MongoDB hoặc đồng bộ hai hệ.

QA-01 tối thiểu kiểm tra: nháp không đổi kho; không bán vượt tồn; xác nhận/hủy không tác động lặp;
lỗi giữa chừng rollback; nhiều phiên tranh chấp tồn cuối; lịch sử khớp tồn; kiểm kê có lý do;
giá giao dịch giữ nguyên khi giá sản phẩm đổi; doanh thu và xóa/ngừng kinh doanh đúng quy tắc đã chốt.
Reset/giả lập mất dữ liệu chỉ ở lab đã xác minh, không dùng DB ứng dụng.

## 6. Hoàn thiện, dợt và nộp 23–30/11

| Mã | Công việc / nghiệm thu | Thực hiện | Kiểm tra | Hạn |
|---|---|---|---|---|
| REL-01 | Báo cáo đầy đủ theo outline: mục lục, thiết kế, kết quả, phân tích, tham khảo, đóng góp và biên bản thật | A ghép; từng người hoàn thiện phần mình | C rà cấu trúc; owner đối chiếu số liệu | 24/11 |
| REL-02 | Chạy từ checkout/DB sạch; hướng dẫn setup, migration, seed, app, lab, backup/restore khớp lệnh thật | B chuẩn bị hướng dẫn; owner bổ sung module | E chạy độc lập; A rà bằng chứng | 24/11 |
| REL-03 | Kịch bản trình bày chung, chuyển phần, baseline và cách chạy lại demo | A ghép; từng người viết phần mình | E chạy thử; C rà UI/thời lượng theo yêu cầu môn | 24/11 |
| REL-04 | Dợt lần 1; ghi lỗi/câu hỏi/thời lượng có owner và hạn sửa | A điều phối; cả nhóm trình bày | E tổng hợp; mỗi người góp câu hỏi | 25/11 |
| REL-05 | Sửa sau dợt; chạy lại ca lỗi và phần liên quan, cập nhật báo cáo nếu số liệu đổi | Owner của lỗi; A ưu tiên | Reviewer module/chủ đề tương ứng | 26/11 |
| REL-06 | Tổng duyệt đúng bản dự kiến nộp; xác minh lỗi REL-04 đã đóng hoặc ghi rõ phần chưa đạt | A điều phối; cả nhóm demo | E rà checklist; C đối chiếu báo cáo/demo | 27/11 |
| REL-07 | ZIP đủ nội dung, ghi phiên bản nguồn; giải nén và chạy theo hướng dẫn | A đóng gói | E kiểm tra độc lập | 28/11 |
| REL-08 | Dự phòng, sửa lỗi cần thiết, hồi quy và đóng băng ZIP cuối | Owner sửa; A đóng gói lại nếu cần | E kiểm tra lại phần ảnh hưởng và ZIP mới | 29/11 |
| REL-09 | Nộp đúng ZIP trước giờ LMS, kiểm tra tệp tải lên và lưu xác nhận | A | E đối chiếu bản đã kiểm tra | 30/11 |

Buổi 25/11 nhằm tìm lỗi trước đóng gói, không chỉ đọc báo cáo. Mỗi người phải giải thích được
thiết kế, cơ chế DBMS, kết quả và giới hạn phần mình. Ghi cả câu hỏi chưa trả lời được,
phần demo không tái lập và phần trình bày quá dài; từng vấn đề có owner và hạn 26/11.

Buổi 27/11 dùng đúng mã nguồn, seed, script và báo cáo dự kiến nộp. Chạy từ dữ liệu đã biết;
có tình huống thiếu tồn, hủy lặp, rollback và tranh chấp tồn theo kịch bản đã chuẩn bị.
Thời lượng theo yêu cầu giảng viên xác nhận tại F01; slide không bắt buộc.
Không thay demo thật bằng log/ảnh cũ mà không nói rõ đó là bằng chứng lần chạy trước.

Checklist ZIP: PDF mở được và có tham khảo; mã nguồn; schema/migration/model;
generator/seed tái tạo; script/demo hai hệ; hướng dẫn; kết quả/phân tích; đóng góp,
biên bản và bằng chứng review thật. Không đưa credential, volume, dependency, backup/dump
hoặc dữ liệu lớn không cần thiết vào ZIP; giữ đủ cách tái tạo.
Ngày 30/11 dành cho nộp và xác nhận, không dự kiến viết chức năng hoặc ghép báo cáo lần đầu.

## 7. Nhịp làm việc, trạng thái và điều kiện hoàn thành

- Đầu sprint khoảng 30 phút: xác nhận khả năng tham gia, mục tiêu tích hợp và task theo phụ thuộc.
  Không tự gán giờ công; việc vượt khả năng phải chia nhỏ hoặc phân phối lại.
- Hằng ngày cập nhật đã xong gì, tiếp theo làm gì, đang chờ mã task nào; ưu tiên gỡ việc chặn người khác.
- Giữa sprint khoảng 15 phút rà rủi ro. Review/ghép từng phần khi sẵn sàng, không đợi cuối tuần.
- Review 15/11 và 22/11 khoảng 45–60 phút: demo bản chung, kiểm tra bằng chứng, rút kinh nghiệm,
  cập nhật kế hoạch. Ngày 27/11 kết hợp review với tổng duyệt, bố trí đủ thời gian demo.
- Ghi biên bản theo [mẫu](meetings/TEMPLATE.md); chưa họp thì không tạo biên bản giả.

Board: **Backlog → Ready → In progress → Review/Test → Done**.
Task bị chặn giữ trạng thái thực tế, thêm nhãn blocked và mã phụ thuộc/người cần hỗ trợ.
Chỉ vào Ready khi có người thực hiện, reviewer, đầu vào rõ, hạn và cách nghiệm thu.

| Trường của một thẻ công việc | Nội dung phải ghi |
|---|---|
| Mã / tiêu đề | Mã riêng, liên kết nhóm F/APP/LAB/QA/DOC/REL tương ứng |
| Owner / reviewer | Người thực hiện và người kiểm tra khác người viết |
| Phụ thuộc / người nhận | Mã task đầu vào, điều kiện bắt đầu; ai cần đầu ra tiếp theo |
| Hạn / đầu ra | Ngày bàn giao và đường dẫn file/PR cụ thể |
| Nghiệm thu | Đầu vào, thao tác kiểm tra, kết quả mong đợi; không chỉ ghi “hoàn thành” |
| Trạng thái / bằng chứng | Kết quả thật, lệnh đã chạy, log/liên kết; thiếu gì và vì sao bị chặn |

**Definition of Done:** đầu ra nằm trong bản chung, đúng yêu cầu, được người khác review,
có kiểm chứng thật và tài liệu liên quan. App nhất quán chứng từ–tồn–biến động; thực nghiệm đủ
script/data/điều kiện/kết quả/giải thích trên hai hệ; backup đã restore và đối chiếu; báo cáo có
trích dẫn/bằng chứng. Có file hoặc chạy trên máy cá nhân chưa tự động là Done.
Hiện chưa thiết lập lệnh test ứng dụng; chỉ bổ sung lệnh và kết quả khi triển khai thật.

## 8. Điểm kiểm soát và xử lý trễ

| Mốc | Câu hỏi kiểm soát | Nếu chưa đạt |
|---|---|---|
| 12/11 | Schema/API, khung app và dữ liệu đủ để làm song song chưa? | A và owner ưu tiên phần chặn; dùng hợp đồng/mock đã review cho phần độc lập; ghi task/hạn điều chỉnh |
| 15/11 | Luồng nghiệp vụ chạy xuyên suốt trên bản chung chưa? | D–E ưu tiên nhất quán kho; B/C/A hỗ trợ dữ liệu/UI/tích hợp, không chỉ demo module rời |
| 22/11 | Đủ 12 UC, 8 thao tác, 5 chủ đề hai hệ và bằng chứng chưa? | Liệt kê phần thiếu, owner/reviewer/hạn sửa; báo rủi ro ảnh hưởng dợt, không tự đánh dấu đạt |
| 27/11 | Bản nộp có thể chạy lại và trình bày nhất quán không? | Ưu tiên lỗi chặn demo/nộp và sai dữ liệu; dùng 28–29/11 sửa, hồi quy, kiểm tra lại ZIP |

Bị chặn quá một ngày báo A; lỗi đe dọa mốc chung báo ngay. Ưu tiên tính đúng dữ liệu,
ứng dụng/demo DBMS và đủ bằng chứng; giảm trang trí hoặc mở rộng chưa cần thiết trước.
Không tự bỏ yêu cầu hay đổi deadline. Điều chỉnh phạm vi, phân công chung hoặc quy tắc
phải ghi sổ quyết định và đưa nhóm thống nhất; không biến đề xuất thành đồng thuận.

A có nhiều việc tích hợp/báo cáo, B có nhiều việc nền tảng, D có giao dịch phức tạp.
Mỗi owner làm thiết kế/migration/API miền mình, đầu mối chỉ hợp nhất; hỗ trợ theo khối lượng
và việc đang chặn, không cân bằng chỉ bằng số UC. Giữ 28–29/11 làm dự phòng,
không chủ động xếp tính năng mới vào hai ngày này.
