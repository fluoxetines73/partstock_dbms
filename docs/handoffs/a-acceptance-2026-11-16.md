# Bàn giao A — bản review nghiệm thu Sprint 1–2

Ngày 16/11/2026; thực hiện thay Đạt theo yêu cầu. Owner A, reviewer chính Tuấn (B),
Khánh (C) rà UI/API/F02, Hải (E) kiểm chứng độc lập. **Sẵn sàng nhận review phần A;
chưa nghiệm thu toàn gói hoặc toàn sprint.** Không có xác nhận nhận việc/review của các bạn
trong lần bàn giao này. Nội dung PR/comment phía dưới đã soạn, chưa đăng GitHub.

## A đã thực hiện và bằng chứng

| Phần | Đầu ra | Kiểm chứng / trạng thái |
|---|---|---|
| F02 | 12 UC, hai actor, đặc tả/sơ đồ; ghép giữ lịch sử `229aa11` | A đã duyệt actor; chờ Khánh/owner review đặc tả |
| UC01 backend/database | CRUD hai bảng; FK sản phẩm thật từ B; sửa sắp ID số | Backend 11/11; integration UC01 và UC02–03 PASS |
| UC01 UI | React/Vite, hai tab, thêm/sửa/xóa, lỗi nghiệp vụ/mạng, responsive, focus bàn phím | Build PASS; 5/5 browser test qua API/MySQL lab; [demo/ảnh](../report/demo-mien-a.md) |
| Storage | Fixture hai hệ, script, kết quả năm pha, phân tích và demo | Chạy thật PASS; [chương 3.2](../report/3-2-storage.md); chờ B/Hải |
| Tích hợp thiết kế | F02 và nháp Nam giữ lịch sử; [ERD tổng hợp](../architecture/erd-integrated-review.md) | Chỉ bốn bảng A/B có DDL; chờ E/C và review D–E |
| Điều phối/báo cáo | [Bản tổng hợp](../report/draft-integrated.md), cập nhật tiến độ, demo A, checklist dưới đây | Chưa có chương C/D/E, PDF/ZIP cuối hoặc review nhóm |

Lệnh và điều kiện chạy trong [frontend](../../frontend/README.md),
[backend](../../backend/README.md), [lab Storage](../../experiments/storage/README.md).
Không đưa secret vào commit, không chạy test phá dữ liệu app. Các schema kiểm thử được tạo
riêng trên lab; không coi chạy lại cùng máy là Hải đã xác minh máy thứ hai.

Kiểm tra cuối 16/11: backend 11/11, browser 5/5 và frontend build PASS trên nhánh tích hợp.
Browser từng bị chặn ECONNREFUSED vì mysql-lab đã dừng sau gián đoạn; đã khởi động riêng
dịch vụ này, đợi healthy rồi chạy lại đạt. MongoDB lab không được chạy lại trong lượt này;
kết quả Storage vẫn là lượt chính thức 15/11. Đường dẫn Markdown và diff không có lỗi.

Review kỹ thuật bằng trợ lý phát hiện mất focus khi đóng modal: đã tái hiện bằng test,
sửa và chạy lại toàn bộ browser suite đạt. Đây không thay review B/C/E. Giới hạn nhỏ:
dừng UI fixture ngay lúc khởi tạo hoặc kill cứng có thể để sót schema ngẫu nhiên; xem
cách nhận diện/dọn ở README frontend, không reset DB chung.

## Git: thay đổi nào ở đâu

| Nhánh / commit | Nội dung do A thêm | Phụ thuộc / hướng review |
|---|---|---|
| `experiment/a-storage-management` — `7a263bc` | Lab Storage và báo cáo | Kế thừa B `7038bb6`; review delta so với `feat/uc02-03` |
| `feat/a-uc01-acceptance` — `a3fcd35`, `d901fde`, `4b69031` | Sửa thứ tự ID, UI/tests và sửa focus | Kế thừa lab; review delta so với nhánh Storage |
| `integration/a-sprint2-review` | Ghép F02 (`cc9c4fe`), Nam (`35c0edc`), bản sửa UC01 (`ca2e728`), tài liệu tổng hợp | Bản ứng viên để nhóm review so với main; chứa cả code B và nháp D, không gán toàn bộ cho A |

Tại mốc bàn giao ban đầu, lab/UI và nhánh tích hợp `a834aa1` đã push; main ở `dbc806f`.
Ngày 16/11 A đã yêu cầu bắt đầu quy trình PR tích hợp nền; trạng thái hiện hành ở
[bản chuẩn bị merge](../reviews/main-integration-2026-11-16.md).
Nhánh local `docs/a-sprint1-foundation` đã rebase từ phiên trước nên khác remote;
không dùng nó để push đè lịch sử B đang kế thừa. Công việc mới đi qua chuỗi nhánh trên.

Đề nghị một PR ứng viên tích hợp vào main sau review đủ phạm vi; dùng các diff nhỏ dưới
đây để phân công review. Không merge chồng nhiều PR cùng phạm vi chỉ để tăng số PR.
Nếu nhóm chọn merge B trước, cập nhật lại diff/base PR sau khi B vào main.

- [Diff riêng lab A](https://github.com/fluoxetines73/partstock_dbms/compare/7038bb62875e4d79d4e57c0b2a3edc1622562f38...7a263bcc33db81a5c1b0263b9afbd9664482104f)
- [Diff riêng UC01 mới](https://github.com/fluoxetines73/partstock_dbms/compare/7a263bcc33db81a5c1b0263b9afbd9664482104f...4b69031f494c3bb88985ad9a50777443cc12771c)
- [Ứng viên tích hợp](https://github.com/fluoxetines73/partstock_dbms/compare/dbc806f567f5d8f2429654da0a4c1cdad77c1f15...a834aa1ebb95729aa622b2cb51dc0c42c6d9754b)

## Việc còn lại theo người nhận

Các mục dưới là bàn giao theo ownership hiện có, không phải xác nhận các bạn đã nhận hoặc
đã hoàn thành. Mốc 15/11 đã qua; đây là phần còn tồn cần xử lý trước nghiệm thu lại.

| Người | Việc cần phản hồi/làm tiếp | Điều kiện đóng |
|---|---|---|
| Tuấn (B) | Review A: UC01/schema/FK, Storage; phối hợp D–E tạo tồn ban đầu, hoàn thiện phần B theo plan | Review ghi cụ thể kết quả; sửa lỗi quan trọng; chạy lại lab/UC01 |
| Khánh (C) | Rà F02, ghép CatalogPage vào shell chung; hợp nhất API, nhận diện phiên/quyền với A; tiếp tục UC05–06–11/query và bảng 8 thao tác | UI/API dùng hợp đồng thống nhất, test hai actor; bàn giao code/lab/chương báo cáo C |
| Nam (D) | Cùng Hải chốt kho; triển khai chứng từ/transaction từ F03/F04, làm rõ hủy/sửa sai phiếu nhập | Migration/API/UI thật; rollback/chống lặp và lab hai hệ có bằng chứng |
| Hải (E) | Cùng Nam chốt kiểm kê/ngưỡng/kho; review D; chạy lại phần A, restore B trên máy khác; tiếp tục UC09–10–12/concurrency | Kết quả tái tạo và test độc lập; thiết kế kiểm kê/schema được bàn giao |
| A | Xử lý phản hồi, chốt cùng nhóm danh tính/quyền và quy tắc còn mở; ghép module/ERD/chương còn thiếu | Có review thành viên, bản chung chạy đủ, bằng chứng thật; sau đó mới ghi Done |

Lưu ý cho Tuấn: migration runner hiện nhận biết đã chạy qua sự tồn tại/tên/loại bảng,
chưa đối chiếu cột/UNIQUE/FK. Không coi thông báo "already applied" là kiểm tra schema drift.
Nhờ review bổ sung trước khi sử dụng trên DB đã từng sửa tay; không reset DB app để né lỗi.

## Nội dung PR đã chuẩn bị ở mốc bàn giao

Cập nhật: PR tích hợp nền dùng [nội dung và checklist riêng](../reviews/main-integration-2026-11-16.md).
Các điều kiện nghiệm thu toàn sprint bên dưới không chặn việc tích hợp nền đã được review.

**Tiêu đề:** `[Review] Hoàn thiện UC01 và Storage của A, ghép thiết kế cho nghiệm thu Sprint 1–2`

**Body:**

UC01 trước đây có API nhưng chưa có UI và test vẫn dùng FK fixture. Bản này bổ sung React/Vite
CRUD danh mục/thương hiệu, dùng migration sản phẩm thật khi kiểm thử, sửa thứ tự ID số và
trả focus sau hộp thoại. Kèm lab Storage đã chạy trên MySQL/MongoDB, báo cáo/demo A, F02 và
nháp F03/F04 giữ nguyên tác giả, ERD tổng hợp và bảng công việc còn thiếu.

Kiểm chứng: backend 11/11, integration UC01/UC02–03 PASS, browser 5/5 qua MySQL lab,
frontend build PASS; Storage năm pha có kết quả thật. Không chạy lab Indexing/restore thay
B/E trong lượt này. Token quản lý local chưa phải nhận diện hai actor; code C/D/E và một
số quy tắc chung còn thiếu. Nhờ Tuấn review A, Khánh review UI/API/F02 và phần B theo plan,
Hải rà tích hợp/tái tạo và review miền Nam. Chưa đề nghị đánh dấu sprint Done hoặc merge
khi chưa có review thành viên.

## Comment bàn giao đã chuẩn bị, chưa gửi

**Tuấn:** “Mình đã xong bản UC01 UI–API–DB để review và lab Storage năm pha hai hệ.
Nhờ Tuấn review diff A, đặc biệt FK sản phẩm, thứ tự ID số, cách đo storage và khả năng chạy
lại. Backend/browser test đang đạt; phần auth hai actor còn mở. Migration runner hiện chỉ
nhận biết bảng đã có, nhờ Tuấn rà thêm schema drift trước nghiệm thu.”

**Khánh:** “Mình đã làm CatalogPage độc lập cho UC01. Nhờ Khánh ghép vào shell/navigation
chung, rà API và cùng mình thống nhất phiên/quyền; không nhúng token vào bundle. F02 hai actor
đã ghép để Khánh review. UC05–06–11, lab Query và đối chiếu tám thao tác vẫn theo phần Khánh.”

**Hải:** “Nhờ Hải chạy lại UC01 và Storage trên máy của Hải, ghi kết quả thật và lỗi nếu có;
đây sẽ là kiểm chứng máy thứ hai. Restore của Tuấn cũng cần Hải kiểm tra độc lập. Phần
kiểm kê/ngưỡng tồn và giao diện cập nhật kho nhờ Hải chốt cùng Nam để mình hoàn tất ERD.”

**Nam:** “Mình đã ghép F03/F04 giữ nguyên lịch sử và trạng thái nháp. Nhờ Nam cùng Hải
chốt cơ chế kho, điều kiện hủy khi hàng quay lại, mốc kiểm kê và cách sửa sai phiếu nhập;
Khánh rà doanh thu sau hủy. Khi có migration/API/test miền D mình sẽ ghép vào bản chung.”

## Checklist nghiệm thu toàn Sprint 1–2

- [ ] Tuấn review A; Khánh review B/F02/UI/API; Hải review Nam theo plan.
- [ ] Hai actor được thực thi ở backend và có kiểm thử quyền tương ứng.
- [ ] Quy tắc chung và thiết kế E/C được chốt, ERD/migration/API nhất quán.
- [ ] Đủ module và lab/chương báo cáo từng người; tám thao tác có bằng chứng.
- [ ] Hải kiểm thử tích hợp, tái tạo máy thứ hai và restore độc lập.
- [ ] A xử lý phản hồi, ghi PR/review thật, tích hợp sau review; không tự nhận thay người khác.

Giờ LMS/thời lượng trình bày cần A xác minh khi có thông báo môn học. Không cần Figma để
nghiệm thu UC01 hiện tại. Figma có thể bổ sung nếu C cần thống nhất nhiều màn; chưa chặn
UI đã chạy. Chưa có gh/token GitHub hoặc trình duyệt kết nối trong môi trường agent nên
chưa tạo PR/comment/review request trực tuyến; Git push qua SSH hoạt động.
