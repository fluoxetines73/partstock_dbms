## Vai trò và nhiệm vụ

Bạn là trợ lý kỹ thuật hỗ trợ nhóm 5 sinh viên khởi tạo repository **PartStock** cho bài tập lớn môn Database Management Systems tại HCMUT. Hãy thực hiện việc tạo các file và thư mục trực tiếp trong workspace, không chỉ đề xuất cây thư mục.

Nhiệm vụ hiện tại: tạo bộ khung repository, tài liệu cộng tác và hướng dẫn cho coding agent. Chưa triển khai toàn bộ ứng dụng hoặc toàn bộ thực nghiệm. Dùng chính bối cảnh dưới đây để viết nội dung thực chất, không chỉ tạo các file rỗng hoặc chép prompt vào AGENTS.md.

Trước khi sửa: kiểm tra thư mục hiện tại, trạng thái Git nếu có, và đọc các AGENTS.md áp dụng. Giữ nguyên thay đổi có sẵn. Nếu repo chưa tồn tại, tạo trong thư mục hiện tại khi đó là workspace chuyên dụng; nếu workspace chứa dự án khác, tạo thư mục con `partstock-dbms/`. Chỉ hỏi khi vị trí đích hoặc dữ liệu hiện có tạo ra xung đột thực sự. Không tự xóa, ghi đè hoặc reset code của người dùng.

## 1. Bối cảnh học phần và sản phẩm

- Tên ứng dụng: **PartStock**.
- Tên đầy đủ: **PartStock — Hệ thống quản lý bán hàng và tồn kho linh kiện máy tính**.
- Tên đề tài báo cáo: **So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**.
- Repository dự kiến: `partstock-dbms`.
- 5 thành viên có năng lực tương đương, tạm ký hiệu A–E để tự nhận việc. A là nhóm trưởng.
- Nhóm chưa triển khai code tại thời điểm lập kế hoạch; hãy đối chiếu với trạng thái workspace thực tế trước khi hành động.
- Hạn nộp giảng viên đã xác nhận: **30/11/2026**, giờ cụ thể theo LMS.
- Kế hoạch gốc bắt đầu 04/11/2026. Nếu ngày hiện tại khác, không tự đổi deadline hoặc khẳng định các mốc đã hoàn thành.

BTL gồm hai phần:

1. Nghiên cứu, thực nghiệm và so sánh hai DBMS: MySQL và MongoDB.
2. Xây dựng ứng dụng chạy ổn định trên ít nhất một DBMS. Nhóm chọn MySQL cho ứng dụng; MongoDB dùng cho thực nghiệm đối chiếu. Không cần xây ứng dụng thứ hai hoặc cơ chế đồng bộ hai database.

Rubric: cấu trúc báo cáo 10%, nội dung 10%, thuyết trình 10%, teamwork 10%, demo DBMS 30%, ứng dụng 30%. Vì vậy repo phải phục vụ cả phần ứng dụng và thực nghiệm.

Mỗi người nghiên cứu ít nhất một chủ đề trên **cả hai hệ**, có kịch bản chạy, bằng chứng, phân tích và kết luận theo bối cảnh. Năm chủ đề bắt buộc: storage & management, indexing, query processing, transaction, concurrency control. Không chỉ viết lý thuyết hoặc đưa con số thời gian thiếu giải thích.

Nhóm bổ sung **backup/restore trên cả hai hệ**; đây không phải chủ đề thay thế cho một trong năm chủ đề, cũng không mặc nhiên bảo đảm bonus. Recovery nội bộ của DBMS và backup/restore quản trị không được đánh đồng.

Sản phẩm nộp: báo cáo kỹ thuật PDF, mã nguồn và ứng dụng chạy được, script/demo hai hệ, hướng dẫn chạy, kết quả thực nghiệm, đóng góp từng thành viên và biên bản họp. Nhóm trưởng nộp một ZIP lên LMS. Mỗi người trình bày phần mình. Slide không bắt buộc.

## 2. Phạm vi nghiệp vụ

Ứng dụng phục vụ nhân viên/quản lý nội bộ **một cửa hàng, một kho linh kiện máy tính**. Luồng chính: quản lý linh kiện → nhập hàng → bán hàng → cập nhật tồn kho → báo cáo.

Không mở rộng cửa hàng online cho khách, thanh toán trực tuyến, giao hàng, nhiều chi nhánh, bảo hành, hóa đơn điện tử hoặc hệ phân tán phức tạp trong giai đoạn này.

12 use case dự kiến:

| ID | Chức năng | Chủ sở hữu |
|---|---|---|
| UC01 | Quản lý danh mục và thương hiệu | A |
| UC02 | Quản lý linh kiện, thông số, giá bán | B |
| UC03 | Quản lý nhà cung cấp | B |
| UC04 | Tạo/xác nhận phiếu nhập và tăng tồn kho | D |
| UC05 | Tra cứu sản phẩm theo mã/tên | C |
| UC06 | Lọc sản phẩm theo loại, hãng, giá, tồn kho | C |
| UC07 | Tạo/xác nhận đơn bán và trừ tồn kho | D |
| UC08 | Hủy đơn theo quy tắc và hoàn tồn kho | D |
| UC09 | Tra cứu lịch sử nhập/xuất/tồn | E |
| UC10 | Cảnh báo tồn kho dưới ngưỡng | E |
| UC11 | Báo cáo doanh thu theo thời gian | C |
| UC12 | Kiểm kê và điều chỉnh tồn kho có lý do | E |

Đề yêu cầu tối thiểu 10 use case nghiệp vụ cho 5 người; login/logout/quên mật khẩu không được tính. Cần có sơ đồ use case trong sản phẩm sau này.

Phải bao phủ 8 dạng thao tác: insert, delete, update, truy vấn điều kiện đơn, điều kiện kết hợp, join, subquery, aggregate. Tạo bảng theo dõi bằng chứng, chưa đánh dấu đạt khi chưa có code/demo. Delete có thể áp dụng chứng từ nháp hoặc dữ liệu chưa được tham chiếu; không phá lịch sử nghiệp vụ để đủ rubric.

Quy tắc nghiệp vụ định hướng:

- Chứng từ nháp chưa tác động tồn kho.
- Xác nhận nhập/bán/hủy/kiểm kê cập nhật chứng từ, tồn kho và lịch sử một cách nhất quán.
- Không bán vượt tồn; không hoàn kho lặp lại cho cùng lần hủy.
- Lưu giá bán tại thời điểm giao dịch trong dòng đơn.
- Sản phẩm có lịch sử được ngừng kinh doanh thay vì xóa lịch sử.
- D và E dùng một quy ước cập nhật kho/ghi biến động thống nhất.
- Trạng thái được phép hủy, cách tính doanh thu sau hủy và schema chi tiết cần nhóm chốt; hãy ghi là quyết định còn mở, không tự coi đã thống nhất.

## 3. Công nghệ và cấu trúc

Định hướng: React + Vite frontend; Node.js + Express + TypeScript backend; MySQL cho ứng dụng; MongoDB cho so sánh; Docker Compose cho môi trường; GitHub để cộng tác. Thư viện UI, cách truy cập DB và phiên bản cụ thể chưa chốt.

Ở bước này tạo cấu trúc và tài liệu; không cài dependency, không chạy container, không chọn ngầm ORM/framework mới. Không tạo package.json/compose.yaml có cấu hình giả rồi mô tả là chạy được. Có thể đặt `compose.example.yaml` làm mẫu có chú thích nếu hữu ích, còn compose.yaml thật là việc triển khai môi trường kế tiếp.

Cây tối thiểu mong muốn:

```text
partstock-dbms/
├── AGENTS.md
├── README.md
├── CONTRIBUTING.md
├── .gitignore
├── .env.example
├── frontend/
│   └── README.md
├── backend/
│   └── README.md
├── database/
│   ├── README.md
│   ├── mysql/README.md
│   ├── mongodb/README.md
│   └── seed/README.md
├── experiments/
│   ├── AGENTS.md
│   ├── README.md
│   ├── storage/README.md
│   ├── indexing/README.md
│   ├── query-processing/README.md
│   ├── transactions/README.md
│   ├── concurrency/README.md
│   └── backup-restore/README.md
├── agent/
│   ├── README.md
│   ├── context.md
│   ├── decisions.md
│   └── handoff-template.md
└── docs/
    ├── plan.md
    ├── requirements.md
    ├── ownership.md
    ├── architecture/README.md
    ├── meetings/TEMPLATE.md
    └── report/outline.md
```

Có thể thêm file cần thiết nhưng giữ bộ khung gọn. Thư mục phải được Git lưu nhờ file hữu ích, không cần .gitkeep khi đã có README.

`database/` chứa schema/migration/seed dùng chung; `experiments/` chứa các kịch bản kiểm chứng cơ chế DBMS, điều kiện chạy và kết quả. `agent/` chứa ngữ cảnh, quyết định và mẫu bàn giao cho agent; không phải module chạy trong ứng dụng và không tự khởi tạo hệ đa tác tử.

Dùng chính xác **AGENTS.md** viết hoa ở root, không tạo `agent.md` trùng chức năng. `agent/` là thư mục tài liệu hỗ trợ được AGENTS.md tham chiếu. AGENTS.md trong experiments áp dụng quy tắc bổ sung cho thực nghiệm; không sao chép toàn bộ file root.

## 4. Phân công và quyền nhóm trưởng

| Người | Chủ đề trên hai hệ | Phần ứng dụng | Trách nhiệm chung |
|---|---|---|---|
| A — Nhóm trưởng | Storage & management | UC01 | Chốt thiết kế/phạm vi, backlog, sprint, tích hợp, báo cáo tổng thể, nộp bài |
| B | Indexing | UC02–03 | Môi trường, seed, backup/restore hai hệ |
| C | Query processing | UC05–06–11 | Khung UI và đối chiếu 8 dạng thao tác |
| D | Transaction | UC04–07–08 | Giao dịch chứng từ/tồn kho và lỗi giữa chừng |
| E | Concurrency control | UC09–10–12 | Kiểm thử tích hợp/đồng thời; kiểm chứng restore với B |

A khởi động repo và quy ước Git. B phụ trách triển khai môi trường; A kiểm tra cả nhóm chạy được. A có thể hỗ trợ bootstrap nhưng không mặc định nhận hết phần B. Mỗi người phụ trách chức năng xuyên suốt UI–API–database và báo cáo/demo của mình.

A chủ trì quyết định chung, điều chỉnh ưu tiên/khối lượng và kiểm soát merge; B–E đóng góp thiết kế phần chuyên môn. Code A cũng phải được người khác review. Không tự tạo quy định agent phải xin phép A cho mọi chỉnh sửa nhỏ đã được yêu cầu. Thay đổi phạm vi, schema/API hoặc quy tắc chung có ảnh hưởng người khác phải được ghi nhận và đưa ra để nhóm thống nhất.

Phụ thuộc chính: schema/API chung → sản phẩm/nhà cung cấp → nhập/bán → lịch sử kho/doanh thu. D–E phải chốt chung cơ chế cập nhật kho. Dùng seed/mock theo hợp đồng đã thống nhất để làm song song. Bị chặn quá một ngày thì báo A.

## 5. Kế hoạch Agile cần đưa vào docs/plan.md

- Sprint 1, 04–08/11: nền tảng, schema/API bản đầu, quy tắc kho, repo/môi trường, UI khung, mỗi người demo sơ bộ hai hệ. Mốc 06/11 chốt thiết kế bản đầu; B–D kiểm tra cấu hình MongoDB cho transaction. Review 08/11.
- Sprint 2, 09–15/11: tích hợp nhập → bán → hủy → đối chiếu tồn; tìm kiếm/lọc; lịch sử/cảnh báo; kết quả thực nghiệm đầu tiên; backup/restore seed chạy được. Review 15/11.
- Sprint 3, 16–22/11: đủ 12 use case, 8 dạng thao tác, 5 chủ đề trên hai hệ, backup/restore được kiểm chứng; báo cáo bản đầu. Review 22/11.
- Sprint 4, 23–27/11: sửa lỗi, chạy môi trường sạch, hoàn thiện hướng dẫn/báo cáo, diễn tập, ZIP dự kiến. Review 27/11.
- 28–29/11: dự phòng, kiểm tra hồi quy phần bị sửa, đóng băng bản nộp; A và một người kiểm tra ZIP.
- 30/11: A nộp theo giờ LMS và lưu xác nhận.

Trong plan cần có bảng nhiệm vụ A–E cho từng sprint, suy ra từ ownership và mục tiêu trên; không bịa trạng thái đã xong hoặc ước lượng giờ chưa có căn cứ.

Nhịp: đầu sprint 30 phút; cập nhật hằng ngày bằng tin nhắn; giữa sprint 15 phút rà rủi ro; cuối sprint 45–60 phút demo/review và biên bản. Board: Backlog → Ready → In progress → Review/Test → Done. Mỗi task có owner, reviewer, hạn, phụ thuộc, tiêu chí nghiệm thu và bằng chứng.

Definition of Done: chạy trong bản chung, đáp ứng nghiệp vụ, review; thực nghiệm có script/data/điều kiện/kết quả/giải thích; backup đã restore và kiểm chứng; báo cáo có trích dẫn và bằng chứng. Không báo hoàn thành chỉ vì đã có file.

## 6. Yêu cầu viết AGENTS.md

Viết ngắn gọn nhưng đủ để agent mới đọc hiểu ngay:

1. Mục tiêu học phần và hai phần ứng dụng/thực nghiệm.
2. Bản đồ repo và đường dẫn cần đọc theo loại nhiệm vụ; các file nguồn sự thật.
3. Phạm vi công nghệ và quyết định còn mở.
4. Quy tắc sửa code: thay đổi nhỏ, đúng task; không xóa thay đổi có sẵn; không tự mở rộng tính năng; cập nhật tài liệu liên quan.
5. Quy tắc DB: schema/seed đặt đúng nơi; tránh migration phá dữ liệu; không chạy bài thử phá hủy trên database ứng dụng.
6. Tên dự kiến `partstock` cho app và `partstock_lab` cho lab; phải có kết nối/cấu hình tách biệt, không chỉ dựa vào tên. Không hardcode credential thật.
7. Quy tắc kiểm chứng: chỉ công bố test/demo đã chạy; nếu chưa có lệnh chạy thì ghi chưa thiết lập; không bịa thời gian, kết quả benchmark, ảnh chụp hoặc kết luận hệ nào thắng.
8. Quy tắc Git: nhánh theo task, PR và review; không tự push/merge, sửa branch protection hoặc tạo repo remote khi chưa được yêu cầu.
9. Bàn giao: file thay đổi, cách kiểm tra, kết quả thật, việc còn thiếu, phụ thuộc và quyết định cần nhóm chốt.
10. Trỏ đến docs/ownership.md, docs/plan.md, agent/context.md và agent/decisions.md; tránh lặp toàn bộ kế hoạch trong AGENTS.md.

Dùng tiếng Việt cho tài liệu; identifier/path bằng tiếng Anh. Không ép chỉ người sở hữu mới được sửa file vì sẽ cản phối hợp. Không tự động gọi nhiều agent chỉ vì có thư mục agent.

## 7. Tài liệu thực nghiệm

README mỗi chủ đề có: mục tiêu; owner; câu hỏi cần kiểm chứng; kịch bản dự kiến MySQL/MongoDB; đầu vào; bằng chứng cần thu; điều kiện so sánh; cách reset lab; trạng thái chưa triển khai.

Dùng cùng nghiệp vụ/dữ liệu logic để đối chiếu nhưng cho phép mô hình dữ liệu phù hợp từng DBMS; ghi rõ khác biệt. Với đo hiệu năng, ghi phiên bản, cấu hình, quy mô, index, điều kiện cache, số lần chạy và phạm vi kết luận. Không coi một lượt đo là kết luận tổng quát.

Storage phải tìm bằng chứng về tổ chức/lưu trữ, không chỉ đưa ERD. Indexing phải giải thích tác động index. Query processing phải có kế hoạch thực thi. Transaction có commit/rollback và lỗi giữa chừng. Concurrency có nhiều phiên tranh chấp lượng tồn cuối và kiểm tra bất biến. Không cam kết tính năng của DBMS nếu chưa kiểm tra phiên bản/cấu hình.

Backup cơ bản: dữ liệu không thay đổi khi backup; ghi thời gian/kích thước; giả lập mất dữ liệu ở lab; restore vào DB sạch; đối chiếu số lượng và tổng nghiệp vụ. Chưa làm replication/failover/PITR. Backup chứa dữ liệu và không được commit vào Git.

## 8. Yêu cầu file và kiểm tra cuối

- README root phải nói rõ đây là scaffold tài liệu; phân biệt việc đã tạo với bước triển khai tiếp theo. Không đưa lệnh npm/docker không tồn tại như thể chạy được.
- .gitignore bỏ dependency, build/cache, .env thật, log, volume database, backup/dump và artifact thực nghiệm lớn; vẫn giữ .env.example, script SQL, schema và kết quả nhỏ cần báo cáo.
- .env.example chỉ có placeholder, chú thích và tên biến định hướng; không chứa credential thật và không giả vờ ứng dụng đã đọc các biến đó.
- agent/decisions.md phân biệt đã chốt, đề xuất, còn mở; agent/handoff-template.md là mẫu, không bịa lịch sử.
- docs/report/outline.md có khoảng 4–7 phần cấp cao, bao gồm giới thiệu, ứng dụng/thiết kế, thực nghiệm, teamwork, kết luận/tự đánh giá, tham khảo; các chủ đề làm mục con.
- Không tạo GitHub/Jira task, không mời người, không gửi tin nhắn, không deploy hoặc cài dependency trong yêu cầu này.

Sau khi tạo, kiểm tra cây thư mục, file UTF-8, đường dẫn liên kết nội bộ, tính nhất quán A–E/UC01–12/deadline, và git diff nếu có. Không viết test vô nghĩa cho scaffold tài liệu.

Cuối cùng trả lời: đã tạo gì, cây thư mục, kiểm tra đã thực hiện, quyết định còn mở, ba việc A cần làm tiếp. Thực hiện công việc ngay trong phạm vi này; không yêu cầu duyệt thêm chỉ để tạo các file đã được yêu cầu.
