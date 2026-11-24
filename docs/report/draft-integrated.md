# Báo cáo tổng hợp PartStock

**So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**

Bản làm việc ngày **24/11/2026**, tổng hợp theo `main` tại `aeb2ddc`. Các kết quả dưới đây dẫn đến ca kiểm thử, log hoặc báo cáo của lượt chạy tương ứng. Kịch bản trình diễn và cách chuẩn bị môi trường nằm trong [demo tích hợp](demo-tich-hop.md).

## 1. Mục tiêu và phạm vi

PartStock phục vụ một cửa hàng linh kiện máy tính có một kho. Hai vai trò Quản lý và Nhân viên xử lý các nghiệp vụ nội bộ từ quản lý linh kiện, nhập hàng, bán hàng và theo dõi tồn đến báo cáo doanh thu. Phạm vi đề tài giới hạn ở nghiệp vụ nội bộ của cửa hàng.

Ứng dụng dùng MySQL để lưu dữ liệu nghiệp vụ. Các lab dùng MySQL và MongoDB với đầu vào tương đương về logic để so sánh cách tổ chức dữ liệu, đường truy cập, xử lý truy vấn, giao dịch và kiểm soát đồng thời. Lab có mô hình và dữ liệu riêng. Backup/restore là bài thực hành bổ sung. [Yêu cầu và rubric](../requirements.md)

## 2. Thiết kế và hiện thực ứng dụng

React/Vite gọi API Express/TypeScript. Backend thực thi SQL qua `mysql2`. Docker Compose tách MySQL app (`partstock`), MySQL lab và MongoDB lab theo dịch vụ, cổng, tài khoản và volume. Các ca kiểm thử ghi dữ liệu chạy trên schema hoặc collection lab riêng. [Kiến trúc API](../architecture/api-contract.md) · [Môi trường local](../../setup-local-docker.md)

[ERD Chen tổng hợp](../architecture/erd-integrated-review.md) mô tả 10 bảng và 11 quan hệ của migration 001–003. Danh mục và hãng liên kết với linh kiện. Phiếu nhập liên kết nhà cung cấp. Dòng nhập và dòng bán liên kết linh kiện, rồi liên kết biến động bằng khóa ngoại ghép để sản phẩm trên biến động khớp dòng nguồn. Khi thêm linh kiện, ứng dụng tạo dòng tồn bằng 0 trong cùng giao dịch.

Nháp chưa làm đổi tồn và có thể xóa. Xác nhận phiếu nhập cộng tồn. Xác nhận đơn bán chốt giá theo dòng và trừ tồn bằng lệnh cập nhật có điều kiện đủ hàng. Hủy đơn đã xác nhận ghi lý do và hoàn tồn. Mỗi thao tác ghi trạng thái chứng từ, số lượng tồn và biến động trong cùng giao dịch. Kiểm tra trạng thái và ràng buộc duy nhất trên loại biến động và dòng nguồn ngăn tác động lặp. [Quy tắc F03](../architecture/f03-quy-tac-chung-tu-kho.md) · [Ca kiểm thử chứng từ](../../backend/tests-db/uc04-07-08.cjs)

### 2.1 Tiến độ theo use case

| Use case | Phần chạy được và bằng chứng | Phần còn mở |
|---|---|---|
| UC01 · Danh mục và thương hiệu | UI/API CRUD đã kiểm thử với MySQL. Xóa giá trị đang được linh kiện tham chiếu trả `409 RESOURCE_IN_USE`. [Demo A](demo-mien-a.md) | Nghiệm thu bản chung theo hai vai trò. |
| UC02 · Linh kiện | UI/API xem, thêm, sửa, ngừng kinh doanh. Ngừng kinh doanh giữ tồn và chứng từ cũ. API chặn thêm linh kiện đã ngừng kinh doanh vào nháp và chặn xác nhận nháp còn chứa linh kiện đó. [Demo B](demo-mien-b.md) · [Ca tích hợp](../../backend/tests-db/uc04-07-08.cjs) | Chờ Khánh review hợp đồng ngừng kinh doanh. |
| UC03 · Nhà cung cấp | UI/API xem, thêm, sửa. Phiếu nhập đã có khóa ngoại đến nhà cung cấp. [Demo B](demo-mien-b.md) | Q01 về xóa hoặc ngừng sử dụng và cách xử lý phiếu nháp còn là đề xuất. |
| UC04 · Nhập kho | UI/API tạo, sửa, xóa nháp và xác nhận cộng tồn một lần. [Bàn giao D](../handoffs/d-sprint2.md) | Review E và chốt quy tắc F03. |
| UC05–06 · Tra cứu và lọc | UI/API tra mã/tên, lọc theo loại, hãng, giá, tồn. Suite D đối chiếu API UC06 với tồn do chứng từ thật ghi. [Bàn giao C](../handoffs/c-sprint1-2.md) · [Ca tích hợp](../../backend/tests-db/uc04-07-08.cjs) | Màn Tra cứu hỗ trợ dữ liệu mẫu. Khi demo đối chiếu tồn thật, dùng API hoặc màn kết nối MySQL. |
| UC07–08 · Bán hàng và hủy đơn | UI/API ghi nhận bán, từ chối thiếu hàng, hoàn tồn một lần khi hủy. Kiểm thử có rollback thiếu tồn ở dòng thứ hai, xác nhận lặp và hủy lặp. [Ca tích hợp](../../backend/tests-db/uc04-07-08.cjs) | Review E và chốt quyền, thời hạn hủy theo F03. |
| UC09–10 · Lịch sử kho và cảnh báo tồn thấp | Lab E có truy vấn theo kỳ và loại biến động, kiểm chứng số dư theo snapshot và cảnh báo theo ngưỡng trên hai hệ. [Báo cáo E](../../experiments/concurrency/Bao_cao_concurrency.md) | Chưa có UI/API ứng dụng. Còn nơi lưu ngưỡng UC10. |
| UC11 · Doanh thu | UI/API tổng hợp đơn còn `CONFIRMED` theo ngày xác nhận. Suite D đối chiếu với chứng từ thật. [Ca tích hợp](../../backend/tests-db/uc04-07-08.cjs) | Màn hình cần gắn kỳ đã truy vấn vào kết quả. Còn chốt cách tính khi hủy khác kỳ. |
| UC12 · Kiểm kê có lý do | Lab E thử áp chênh lệch lên tồn hiện tại, rollback và hai phiên duyệt cùng phiếu trên hai hệ. [Báo cáo E](../../experiments/concurrency/Bao_cao_concurrency.md) | Chưa có UI/API, bảng kiểm kê và khóa ngoại dòng kiểm kê trong app. Còn chốt cách xử lý số đếm cũ. |

Backend demo kiểm quyền bằng hai token local. Token quản lý dùng cho dữ liệu chủ và doanh thu. Token nhân viên cho phép tra cứu, nhập và bán theo các route đã làm. UI nhập mã cục bộ theo màn hình. Phiên người dùng và ma trận quyền đầy đủ còn mở. [Đặc tả F02](../architecture/use-cases.md) · [Hướng dẫn frontend](../../frontend/README.md) · [Review gói C ngày 24/11](https://github.com/fluoxetines73/partstock_dbms/blob/c9052a9e72e0b3a5679199475bd72a0d15211800/docs/reviews/a-review-c-query-2026-11-24.md)

Ngày 24/11, lượt chạy từ mã nguồn xuất bằng `git archive aeb2ddc` cài dependency theo lockfile từ cache, đạt 11/11 unit test backend, các suite HTTP/MySQL lab UC01, UC02–03, truy vấn và UC04/07/08. Build frontend và 16/16 ca trình duyệt đạt. Lượt này dùng dịch vụ lab và cấu hình local đã chuẩn bị. [Demo tích hợp](demo-tich-hop.md)

### 2.2 Bằng chứng tám dạng thao tác

| Dạng | Kịch bản và kiểm chứng |
|---|---|
| Insert | Thêm linh kiện `RAM-TEST-01` và nhà cung cấp, nhận `201` rồi đọc lại qua GET. [Test UC02–03](../../backend/tests-db/uc02-03.cjs) |
| Delete | Xóa chứng từ nháp trả `204`, xóa chứng từ đã xác nhận trả `409`. Kiểm thử đối chiếu tồn và biến động. [Test UC04/07/08](../../backend/tests-db/uc04-07-08.cjs) |
| Update | Đổi giá từ 450.000 lên 470.000 VND, cập nhật thông số thành `null` và đọc lại. [Test UC02–03](../../backend/tests-db/uc02-03.cjs) |
| Điều kiện đơn | Tra mã `RAM-KIN-08` qua HTTP. [Test truy vấn](../../backend/tests-db/queries.cjs) |
| Điều kiện kết hợp | Lọc danh mục, hãng, khoảng giá và tồn qua HTTP. Test truy vấn dùng dữ liệu mẫu trên migration 003, suite D đối chiếu tồn do giao dịch ghi. [Test truy vấn](../../backend/tests-db/queries.cjs) · [Test tích hợp](../../backend/tests-db/uc04-07-08.cjs) |
| Join | Chi tiết đơn nối đầu đơn, dòng và sản phẩm. Chi tiết phiếu nhập đọc nhà cung cấp. [API đơn bán](../../backend/src/sales.ts) · [API phiếu nhập](../../backend/src/purchases.ts) · [Test tích hợp](../../backend/tests-db/uc04-07-08.cjs) |
| Subquery | `never_sold=true` lấy linh kiện chưa từng bán. Lab đối chiếu `NOT EXISTS` của MySQL với pipeline MongoDB. [Test truy vấn](../../backend/tests-db/queries.cjs) · [Lab truy vấn](3-4-query-processing.md) |
| Aggregate | `GET /api/revenue` trả 1.630.000 VND với fixture C. Suite D còn đối chiếu tổng qua API với đơn thật vừa xác nhận/hủy trên schema lab. [Test truy vấn](../../backend/tests-db/queries.cjs) · [Test tích hợp](../../backend/tests-db/uc04-07-08.cjs) |

## 3. Thực nghiệm MySQL và MongoDB

Các lượt lưu kết quả dùng MySQL 8.4.13/InnoDB và MongoDB 8.0.34/WiredTiger. Các lab có giao dịch MongoDB dùng replica set `rs0` một node. Mỗi bài mô tả seed, quy mô, chỉ mục, cách lấy mẫu và kết quả kiểm tra riêng. Hai hệ được đối chiếu trước hết theo đầu ra và bất biến. Số đo thời gian và dung lượng áp dụng trong điều kiện của từng chương. Lượt chạy lại ngày 24/11 từ bản mã nguồn sạch xác nhận đủ năm pha Storage, ba chế độ Indexing, kết quả Query processing, 38 kiểm tra Transaction và toàn bộ 64 kiểm tra Concurrency trên hai hệ. [Hướng dẫn thực nghiệm](../../experiments/README.md)

| Chương | Quan sát trên hai hệ | Giới hạn |
|---|---|---|
| **3.2 Storage & management · A** | Năm pha từ rỗng, tăng số bản ghi, mở rộng mô tả đến xóa một nửa. Pha cuối cùng còn 2.500 sản phẩm và 1.280.000 byte mô tả logic ở mỗi hệ. Số bản ghi giảm mà cấp phát vẫn cao. [Chương 3.2](3-2-storage.md) · [JSON](../../experiments/storage/results-initial.json) | Mỗi pha một snapshot. Metadata của InnoDB và WiredTiger có ý nghĩa khác nhau, payload lặp dễ nén. |
| **3.3 Indexing · B** | Với 10.000 sản phẩm, index SKU và index ghép hãng–giá giảm đầu vào từ 10.000 còn 1 hoặc 11 dòng/document cho hai truy vấn. Có phép đo dung lượng hai index và chi phí cập nhật giá trên 1.000 bản ghi. [Chương 3.3](3-3-indexing.md) | Một lượt làm nóng và năm mẫu mỗi pha. So thời gian trước/sau trong từng hệ. |
| **3.4 Query processing · C** | Với 2.400 sản phẩm, 4.800 đơn, hai hệ cùng trả 26 sản phẩm khi lọc, 600 sản phẩm chưa từng bán và 599.942.000 VND doanh thu của kỳ thử. Có index, bước lọc tồn xét 40 dòng/document so với 2.400 khi quét. [Chương 3.4](3-4-query-processing.md) · [JSON](../../experiments/query-processing/results-local.json) | Một lượt làm nóng và ba mẫu mỗi kế hoạch. Mỗi đơn mẫu có một dòng. Hai engine báo thời gian theo phạm vi khác nhau. |
| **3.5 Transaction · D** | 10 tình huống, 38/38 kiểm tra trên bộ chạy hai hệ. Lỗi sau khi trừ tồn nhưng trước ghi biến động được rollback trong giao dịch. Ca đối chứng tự commit để lại tồn đã trừ mà sổ chưa ghi. [Chương 3.5](3-5-transaction.md) · [JSON](../../experiments/transactions/results-local.json) | Kiểm tra tính nguyên tử và bất biến. Ca mất kết nối quan sát giao dịch chưa commit. Chưa đo crash recovery hay failover. |
| **3.6 Concurrency control · E** | Cùng bộ 32 ca trên máy Hải ngày 22/11. MySQL đạt 32/32 ở một lượt có cả hai đích, MongoDB đạt 32/32 ở lượt riêng sau khi sửa lệnh gọi. Ngày 24/11, một lượt chạy chung đạt 32/32 trên mỗi hệ. Hai đơn tranh món cuối chỉ có một đơn được xác nhận. Đọc snapshot giữ số dư cũ, hai phiên duyệt kiểm kê chỉ ghi một điều chỉnh. [Chương 3.6](../../experiments/concurrency/Bao_cao_concurrency.md) · [MySQL JSON](../../experiments/concurrency/evidence/2026-11-22/uc-all-2026-11-22T01-53-51-093Z-52dbb0.json) · [MongoDB JSON](../../experiments/concurrency/evidence/2026-11-22/uc-mongodb-2026-11-22T02-29-31-496Z-2e5ea0.json) · [JSON chạy chung 24/11](evidence/concurrency-all-2026-11-24.json) | JSON của lượt chạy chung 22/11 còn ghi lỗi khởi chạy MongoDB. Phiếu kiểm kê lab có một dòng. Kết quả đo tính đúng khi xen kẽ thao tác. |
| **3.7 Backup/restore · B, E kiểm chứng** | MySQL dùng `mysqldump --single-transaction`. MongoDB dùng `mongodump --archive` và `mongorestore` sang namespace khác. Hải xác minh độc lập trên image ghim. Mỗi đích khớp nguồn ở 2 sản phẩm, 1 đơn, 2 dòng đơn, 2 dòng tồn, tổng tồn 11 và doanh thu 1.830.000 VND. Lượt chạy lại qua Docker Compose ngày 24/11 khớp cả sáu giá trị và MongoDB báo 5 document phục hồi, 0 lỗi. [Chương 3.7](3-7-backup-restore.md) · [Log MySQL](../../experiments/concurrency/evidence/restore-mysql.log) · [Log MongoDB](../../experiments/concurrency/evidence/restore-mongodb.log) | Nguồn giữ nguyên khi dump. Chưa có bằng chứng chạy toàn bộ quy trình Docker Compose backup/restore trên máy thành viên thứ hai. |

## 4. Đóng góp và review

| Thành viên | Đầu ra trong bản tích hợp |
|---|---|
| **Đạt (A)** | Nền backend, UC01, lab Storage, ghép ERD Chen và báo cáo. Tuấn tái chạy UC01 và đủ năm pha Storage ngày 23/11, phát hiện so SKU/tên chưa phân biệt hoa thường. Đạt sửa sang đối chiếu theo byte. [Review của Tuấn](../reviews/b-uc01-storage-2026-11-23.md) · [PR #10](https://github.com/fluoxetines73/partstock_dbms/pull/10) · [PR #12](https://github.com/fluoxetines73/partstock_dbms/pull/12) |
| **Tuấn (B)** | UC02–03, migration/seed, lab Indexing và bộ script Backup/restore. Hải đối chiếu kết quả restore trên cả hai hệ. Khánh được phân công review gói B. [PR #9](https://github.com/fluoxetines73/partstock_dbms/pull/9) · [Chương Backup/restore](3-7-backup-restore.md) |
| **Khánh (C)** | UI/API UC05–06–11, lab Query processing và đối chiếu rubric. Đạt review trên `4e3e609` ngày 24/11. Nhật ký review ghi nhận 11/11 unit test backend, 16/16 ca Chromium, các suite HTTP/MySQL lab và kết quả Query processing khớp baseline. Review đề nghị sửa nhãn kỳ UC11, thêm ca đổi kỳ và sửa mô tả quyền Nhân viên trong hợp đồng API. [Review gói C](https://github.com/fluoxetines73/partstock_dbms/blob/c9052a9e72e0b3a5679199475bd72a0d15211800/docs/reviews/a-review-c-query-2026-11-24.md) |
| **Nam (D)** | UI/API UC04/07/08, migration 003 và lab Transaction. Bộ kiểm thử hiển thị mối nối giữa chứng từ của D, danh mục linh kiện của B và truy vấn tồn/doanh thu của C. [PR #8](https://github.com/fluoxetines73/partstock_dbms/pull/8) · [Bàn giao D](../handoffs/d-sprint2.md) |
| **Hải (E)** | Lab UC09/10/12 và concurrency trên hai hệ, log thực chạy trên Mac, kiểm chứng restore độc lập. D và E còn phối hợp chốt thiết kế kiểm kê dùng trong app. [PR #11](https://github.com/fluoxetines73/partstock_dbms/pull/11) · [Báo cáo E](../../experiments/concurrency/Bao_cao_concurrency.md) |

Mốc nghiệm thu Sprint 1–2 ngày 15/11 chưa đạt. Các PR đã ghép và nhật ký review cho biết phần nào đã được kiểm tra. Nghiệm thu toàn nhóm và biên bản vẫn cần bằng chứng riêng. [Phân công](../ownership.md) · [Kế hoạch](../plan.md)

## 5. Kết luận và phần còn mở

Trong các bài đã chạy, hai mô hình cho cùng kết quả logic với đầu vào tương đương. MySQL phù hợp với lựa chọn kiến trúc của PartStock vì khóa ngoại, ràng buộc và giao dịch hỗ trợ chứng từ liên kết với dòng nhập/bán và sổ tồn. Các lab MongoDB cho thấy dòng đơn nhúng thay đổi cách truy vấn, còn cập nhật chứng từ, tồn và sổ ở nhiều collection vẫn cần giao dịch để giữ bất biến. Hiệu quả của chỉ mục, cấp phát và chi phí ghi phụ thuộc cấu hình và workload cụ thể trong từng bài.

Các quyết định nghiệp vụ cần chốt trước nghiệm thu gồm vòng đời nhà cung cấp (Q01), quyền và thời hạn hủy đơn, ảnh hưởng khi hủy khác kỳ, cách xử lý số đếm cũ, ngưỡng tồn thấp và quyền hai vai trò. Theo mặc định hiện tại, hủy đơn tháng 11 vào tháng 12 sẽ làm giảm doanh thu tháng 11 khi xem lại vì truy vấn chỉ cộng các đơn vẫn `CONFIRMED`. Nếu giữ cách áp chênh lệch của lab E thì còn cần thiết kế migration và thực hiện UI/API cho UC09/10/12. [Sổ quyết định](../../agent/decisions.md) · [F03](../architecture/f03-quy-tac-chung-tu-kho.md) · [Review gói C](https://github.com/fluoxetines73/partstock_dbms/blob/c9052a9e72e0b3a5679199475bd72a0d15211800/docs/reviews/a-review-c-query-2026-11-24.md)

Chín trong 12 use case đã có UI/API trong ứng dụng. Để đạt mức tối thiểu 10 use case nghiệp vụ, nhóm cần đưa ít nhất một trong UC09, UC10, UC12 từ lab vào ứng dụng và kiểm chứng qua UI/API/MySQL. Kế hoạch của nhóm bao gồm cả ba. Báo cáo đã có bằng chứng cho tám thao tác và năm chủ đề trên hai DBMS. Nhóm còn phải review các phần mở và diễn tập với ZIP dự kiến nộp. Mốc tiếp theo gồm diễn tập 25–27/11, đóng gói ngày 28/11, Hải kiểm tra ZIP độc lập và Đạt nộp trước giờ LMS ngày 30/11. Giờ LMS và thời lượng trình bày còn chờ xác minh. [Rubric](../requirements.md#rubric-và-đầu-ra) · [Kế hoạch đóng gói](../plan.md#6-hoàn-thiện-và-nộp-bài)

## 6. Tài liệu tham khảo và phụ lục

Mỗi chương thực nghiệm dẫn tài liệu kỹ thuật, nguồn mã và kết quả phù hợp với bài thử. Khi ghép PDF, dùng sơ đồ, truy vấn và log tương ứng với phiên bản đã kiểm chứng. Kịch bản thao tác và dữ liệu đầu vào dùng trong buổi trình bày nằm trong [demo tích hợp](demo-tich-hop.md). Gói nộp gồm PDF, source, migration/model, seed, script hai hệ, hướng dẫn chạy, kết quả và bằng chứng đóng góp.
