# Báo cáo tổng hợp bản đầu — PartStock

Ngày 16/11/2026. A tổng hợp từ đầu ra trong repo; **bản làm việc chưa đủ để nộp**.
Phần UC02–03, demo Indexing và kiểm chứng restore được cập nhật ngày 23/11/2026.
Chương chuyên đề giữ ở file riêng và liên kết bên dưới; đây chưa phải PDF hoặc báo cáo hoàn chỉnh.
Không có biên bản nghiệm thu/review nhóm được tạo trong lần tổng hợp này.

## 1. Bối cảnh, mục tiêu và phạm vi

PartStock mô phỏng hệ thống nội bộ cho một cửa hàng linh kiện máy tính với một kho.
Nhân viên thực hiện nhập, bán và tra cứu; quản lý có thêm quyền quản lý dữ liệu,
hủy đơn, kiểm kê và xem doanh thu theo ma trận trong đặc tả. Luồng nghiệp vụ đi từ
dữ liệu linh kiện qua nhập hàng, bán hàng, theo dõi tồn đến báo cáo.

Dự án có hai sản phẩm liên quan nhưng tách biệt. Ứng dụng sử dụng MySQL để quản lý nghiệp vụ.
Các thực nghiệm chạy cùng dữ liệu logic trên MySQL và MongoDB nhằm giải thích cơ chế
storage, indexing, query processing, transaction và concurrency. MongoDB không phải
backend thứ hai của ứng dụng và không nhận dữ liệu đồng bộ từ app.

Phạm vi không gồm cửa hàng online, thanh toán trực tuyến, giao hàng, nhiều chi nhánh,
bảo hành hay hóa đơn điện tử. Backup/restore là phần bổ sung, không thay năm chủ đề.
Yêu cầu, rubric và đầu ra nộp được theo dõi tại [requirements](../requirements.md).

## 2. Thiết kế và hiện thực ứng dụng

[F02](../architecture/use-cases.md) mô tả 12 use case và hai actor Quản lý/Nhân viên.
Hai actor đã được A duyệt; đặc tả còn chờ review owner. Bản
[ERD tổng hợp](../architecture/erd-integrated-review.md) tách rõ bốn bảng đã có migration
với cấu trúc chứng từ/kho mới là đề xuất của Nam và phần kiểm kê chưa có đầu vào Hải.

Ứng dụng hiện đi theo React/Vite → Express/TypeScript → MySQL app. Backend dùng mysql2
và SQL trực tiếp. UC01 đã có màn danh mục/thương hiệu, CRUD, kiểm tra tên và FK RESTRICT
với sản phẩm. UC02–03 có giao diện và API xem, thêm, sửa do Tuấn phụ trách, đã kiểm thử
qua MySQL lab. Quản lý có thể ngừng kinh doanh linh kiện. Các quyết định về ngừng sử dụng
nhà cung cấp được theo dõi ở [Q01](../../agent/decisions.md#q01-nha-cung-cap).

App và lab tách dịch vụ Docker, cổng, credential và volume. Các kiểm thử gây thay đổi
dữ liệu chạy trong schema lab ngẫu nhiên, không reset DB app. Mỗi máy giữ dữ liệu riêng;
cùng migration/seed không có nghĩa cùng một DB online. Nhận diện hiện tại dùng token
quản lý local, chưa thực thi đầy đủ ma trận quyền hai actor.

Bằng chứng UC01 và demo ở [demo A](demo-mien-a.md). Bằng chứng UI/API UC02–03 và các ca demo ở
[demo B](demo-mien-b.md). [Bảng 8 thao tác](../requirements.md#theo-dõi-8-dạng-thao-tác)
chưa đủ bằng chứng: không lấy CRUD UC01 thay các kịch bản chứng từ/truy vấn còn thiếu.

## 3. Thực nghiệm

| Chủ đề | Chương / nguồn hiện có | Giới hạn nghiệm thu |
|---|---|---|
| Storage — A | [3.2](3-2-storage.md), script và kết quả năm pha hai hệ | Chờ B review, tái tạo độc lập |
| Indexing — B | [3.3](3-3-indexing.md), script/kết quả của B và [kịch bản trình bày](demo-mien-b.md#2-indexing-trên-mysql-và-mongodb) | Chờ Khánh review. Timing dùng để đối chiếu trước/sau trong từng hệ. |
| Query processing — C | [Báo cáo](3-4-query-processing.md), [kết quả và hướng dẫn](../../experiments/query-processing/README.md) | Đã chạy MySQL và MongoDB, khớp baseline; chờ review và chạy lại độc lập |
| Transaction — D | [3.5](3-5-transaction.md), [script và kết quả](../../experiments/transactions/README.md), F03/F04 | Đã chạy 10 ca trên MySQL và MongoDB, 38/38 kiểm tra đạt trên máy của D; chờ E review và chạy lại độc lập |
| Concurrency — E | [README chủ đề](../../experiments/concurrency/README.md) | Chưa có chương/kết quả hoàn chỉnh trong bản rà |
| Backup/restore — B | [3.7](3-7-backup-restore.md), gồm kiểm chứng độc lập của Hải | Restore đạt trên hai DBMS từ image đã ghim. Còn xác minh Docker Compose trên máy thành viên thứ hai. |

Không gộp các số đo khác quy mô, index, topology hay trạng thái cache thành một bảng xếp
hạng chung. Mỗi chương phải ghi điều kiện, generator, số lượt, cách kiểm chứng, giới hạn
và nguồn tham khảo của chính thí nghiệm. Nguồn kỹ thuật đang dùng nằm trong các chương
3.2/3.3/3.7; chưa tuyên bố đã hoàn tất tài liệu tham khảo cho các chương còn thiếu.

## 4. Đóng góp, phối hợp và tiến độ

[Ownership](../ownership.md) giao A UC01/storage/backend/tích hợp; B UC02–03/indexing/
database; C UC05–06–11/query/UI chung; D UC04–07–08/transaction; E UC09–10–12/concurrency/
kiểm thử độc lập. A ghép nguồn của B và Nam với lịch sử Git được giữ, không nhận phần đó
thành code do A viết. Các commit của A và việc nhờ review được liệt kê trong
[bàn giao nghiệm thu](../handoffs/a-acceptance-2026-11-16.md).

Mốc đủ gói Sprint 1–2 ngày 15/11 chưa đạt. Các phần thiếu được ghi là công việc còn tồn;
không đổi thành việc mới Sprint 3 để coi sprint trước đã hoàn tất. Review bằng trợ lý
chỉ là kiểm tra kỹ thuật hỗ trợ, không thay review chéo thành viên và biên bản nghiệm thu.

## 5. Kết luận tạm thời và phần phải bổ sung

Hiện có thể trình diễn CRUD danh mục/thương hiệu và quan sát storage trên hai DBMS với
bằng chứng tái tạo được. Chưa đủ cơ sở kết luận về toàn hệ thống hoặc DBMS nào tốt hơn.
Trước bản nộp cần đủ module còn thiếu, thống nhất kho/hủy/doanh thu và danh tính, kiểm thử
luồng tích hợp, hoàn thành ba chương C/D/E, review/tái tạo, đối chiếu rubric và xuất PDF.
ZIP chính thức theo mốc 28/11, E kiểm tra độc lập; A nộp trước giờ LMS ngày 30/11.
Giờ LMS và thời lượng trình bày chưa được xác minh, không tự điền.
