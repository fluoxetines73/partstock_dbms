# Kịch bản tổng duyệt PartStock

Kịch bản đối chiếu `main` tại `aeb2ddc`. Ứng dụng React → Express → **MySQL app**
xử lý nghiệp vụ của một cửa hàng, một kho. **MySQL lab** và **MongoDB lab** chạy
các phép thử riêng với fixture do từng runner tạo. Các kết quả kỳ vọng dưới đây dùng
để kiểm tra lượt chạy mới. Bằng chứng lịch sử nằm ở từng chương.

## 1. Chuẩn bị máy và checkout sạch

Mở Docker Desktop hoặc Docker Engine có Compose v2. Dùng Git và Node.js 26.x với
npm. Kiểm tra `docker version` có cả Client và Server, `docker compose version`
và `node --version` chạy được. Mở trình duyệt để demo UI. Nếu chạy Playwright,
cài Chromium bằng `npx --prefix frontend playwright install chromium` sau `npm ci`
hoặc dùng Chromium/Edge qua `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

```text
git clone --branch main https://github.com/fluoxetines73/partstock_dbms.git
cd partstock_dbms
git switch --detach aeb2ddc
git rev-parse --short HEAD
```

- **Windows, PowerShell.** Chạy `powershell -NoProfile -ExecutionPolicy Bypass -File .\database\local\prepare.ps1`. Dùng `npm.cmd` thay `npm` nếu PowerShell chặn `npm.ps1`. [Hướng dẫn Windows](../../setup-local-docker.md#3-tạo-cấu-hình-và-khóa-riêng-cho-máy)
- **macOS, Terminal.** Chạy nguyên khối Bash ở bước 3 để tạo `.env.docker` và `.mongodb/keyfile`. Trong mỗi terminal chạy Compose hoặc runner, đặt `export DOCKER_DEFAULT_PLATFORM=linux/amd64`. Apple silicon dùng image đã ghim qua mô phỏng. Bộ lab E ghi nhận chạy trên Mac. [Hướng dẫn macOS](../../setup-local-docker-macos.md#3-tạo-cấu-hình-và-khóa-riêng-cho-máy) · [Bằng chứng Mac](../../experiments/concurrency/README.md)
- **Linux với Bash.** Có thể dùng khối Bash chuẩn bị file và các lệnh Compose bên dưới. Kiểm tra image `linux/amd64`, kết nối Docker Engine và chạy đối chiếu trên máy thực tế. Hướng dẫn setup của repo ghi nhận quy trình Windows và macOS. [Yêu cầu runner Bash của E](../../experiments/concurrency/README.md)

Dùng máy có cổng mặc định rảnh và volume demo riêng. Khi máy đã có dữ liệu, giữ nguyên
credential và keyfile đi với volume đó. Có thể chọn project Compose riêng bằng
`COMPOSE_PROJECT_NAME=partstock-rehearsal` trong môi trường của mọi terminal chạy Docker
và runner (`export COMPOSE_PROJECT_NAME=partstock-rehearsal` trong Bash,
`$env:COMPOSE_PROJECT_NAME = 'partstock-rehearsal'` trong PowerShell), với điều kiện các
cổng mặc định đã rảnh. Runner giao dịch kiểm tra cổng MySQL lab `3308`. Không chạy `down -v`.

Chạy từng lệnh từ gốc repo và kiểm tra mã thoát trước bước tiếp theo.

```text
docker compose --env-file .env.docker -f compose.local.yaml config --quiet
docker compose --env-file .env.docker -f compose.local.yaml pull
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait
docker compose --env-file .env.docker -f compose.local.yaml ps
docker compose --env-file .env.docker -f compose.local.yaml exec mongo-lab mongosh 'mongodb://127.0.0.1:27017/admin?directConnection=true' --username admin --authenticationDatabase admin --file /opt/partstock/init-mongo.js --password
docker compose --env-file .env.docker -f compose.local.yaml exec -T mongo-lab mongosh --quiet 'mongodb://127.0.0.1:27017/?directConnection=true' --eval 'const h = db.hello(); printjson({setName: h.setName, primary: h.isWritablePrimary});'
```

Ở lệnh khởi tạo, nhập `MONGO_ROOT_PASSWORD` khi `mongosh` hỏi. Kiểm tra ba dịch vụ
`healthy` và MongoDB trả `setName: 'rs0'`, `primary: true`. Các kết nối mặc định là
`mysql-app` → `127.0.0.1:3307/partstock`, `mysql-lab` → `127.0.0.1:3308/partstock_lab`,
`mongo-lab` → `127.0.0.1:27018/partstock_lab`. App dùng `APP_MYSQL_*`. Lab dùng credential
riêng. Giữ `.env.docker`, keyfile, token và dump ngoài ảnh chụp và Git.

## 2. Demo ứng dụng MySQL

```text
npm ci --prefix backend
npm ci --prefix frontend
npm run db:setup --prefix backend
npm run token:manager --prefix backend
```

`db:setup` áp migration `001`–`003`. Lần chạy lại trên schema đủ bảng báo đã áp dụng.
Tạo dữ liệu demo bằng UI trên MySQL app sạch. Các bài test ở phần sau tự nạp seed
vào schema thử trên MySQL lab. Có thể đặt `APP_STAFF_TOKEN` riêng trong `.env.docker`
trước khi mở backend để minh họa giới hạn của Nhân viên. Mã đó phải khác
`APP_MANAGER_TOKEN`. Bản hiện tại xác thực bằng hai token local.
[Quy trình migration](../../database/mysql/README.md#chạy-migration) · [Backend](../../backend/README.md#chạy-local)

Giữ `npm start --prefix backend` và `npm run dev --prefix frontend` chạy ở hai terminal.
Kiểm tra `http://127.0.0.1:3000/health` và `http://127.0.0.1:3000/ready` trả `200`.
`/ready` thực hiện `SELECT 1`. Mở URL Vite in ra, thường `http://127.0.0.1:5173`,
kết nối **Danh mục** bằng `APP_MANAGER_TOKEN`, để ô **Dùng dữ liệu mẫu** ở trạng thái tắt.

| Người | Thao tác và kết quả cần thấy |
|---|---|
| **A — Đạt · UC01** | Thêm danh mục `RAM Demo` và hãng `Hãng Demo`. Thêm danh mục tạm, sửa tên rồi xóa khi chưa có tham chiếu. Sau khi B tạo linh kiện, thử xóa hãng đang được dùng để thấy lỗi và bản ghi được giữ. |
| **B — Tuấn · UC02, UC03** | Tạo nhà cung cấp `NCC Demo`, cập nhật liên hệ. Tạo linh kiện `RAM-DEMO-01`, tên `RAM demo 8 GB`, chọn mục/hãng của A, giá `450000`, thông số `{"capacity_gb":8}`. Sửa giá thành `470000` và đọc lại. Chọn SKU mới mỗi lượt nếu app giữ dữ liệu lần trước. |
| **C — Khánh · UC05, UC06** | **Tra cứu** theo SKU, thấy giá 470.000 VND và tồn 0. Lọc theo danh mục, hãng, giá 450.000–500.000 và **Còn hàng**. SKU xuất hiện sau bước xác nhận nhập của D. |
| **D — Nam · UC04, UC07** | **Nhập kho** → **Tạo phiếu nhập** cho `NCC Demo`, chọn SKU trên, số lượng 5, giá nhập `300000`. **Lưu nháp** giữ tồn 0. Mở lại phiếu, bấm **Xác nhận nhập kho**, thấy tồn 5 khi tra cứu lại. **Bán hàng** → **Tạo đơn bán**, chọn SKU, số lượng 2. Lưu nháp giữ tồn 5. **Xác nhận bán** đưa tồn về 3 và lưu giá bán 470.000 VND/đơn vị. Thử xác nhận một đơn khác với số lượng 4 để thấy từ chối và tồn giữ 3. Xóa đơn nháp đó bằng **Xóa nháp** rồi **Xác nhận xóa nháp**. |
| **C — Khánh · UC11**, sau đó **D — Nam · UC08** | **Doanh thu** với khoảng bao ngày xác nhận theo giờ Việt Nam, ví dụ `[01/11/2026, 01/12/2026)` nếu demo tháng 11. Trên app sạch thấy 1 đơn, 940.000 VND. Quay lại đơn bán, điền lý do và bấm **Hủy đơn và hoàn kho**. Tồn về 5, doanh thu về 0 và đơn vẫn có trạng thái **Đã hủy**. Trên app có giao dịch trước đó, đối chiếu phần chênh lệch 940.000 VND. Nếu có mã Nhân viên, thử hủy từ cửa sổ riêng trước lần hủy của Quản lý và đối chiếu `403`. |
| **E — Hải · UC09, UC10, UC12** | Chuyển sang runner ở phần 3. Tìm theo mã chứng từ trong lịch sử kho, cho thấy cách bật/tắt cảnh báo khi tồn thay đổi và kiểm kê có lý do trong ca tranh chấp. Ba UC này có bằng chứng trên hai lab và chưa có màn hình hay route tương ứng trong app ở commit này. |

Đối chiếu tám dạng thao tác qua các bước trên và test lab. Thêm linh kiện/nhà cung
cấp, xóa nháp, đổi giá, tìm SKU và bộ lọc kết hợp thể hiện trực tiếp trong UI.
Chi tiết chứng từ thể hiện join. `never_sold=true` qua HTTP kiểm tra truy vấn con trong
`queries.cjs`. Doanh thu theo khoảng thời gian thể hiện aggregate. Có thể xem các
kịch bản và kết quả từng miền ở [demo A](demo-mien-a.md), [demo B](demo-mien-b.md),
[bàn giao C](../handoffs/c-sprint1-2.md) và [bàn giao D](../handoffs/d-sprint2.md).

Từ gốc repo, chạy các lệnh sau trên MySQL lab để lấy thêm bằng chứng HTTP và trình duyệt.
Các test tự tạo schema thử, nạp migration/fixture tương ứng và dọn schema sau khi chạy.
Giữ cổng `3101` và `5174` rảnh cho Playwright.

```text
npm test --prefix backend
npm run test:db --prefix backend
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
node --env-file=.env.docker backend/tests-db/queries.cjs
npm run test:db:documents --prefix backend
npm run build --prefix frontend
npm test --prefix frontend
```

## 3. Năm chuyên đề trên hai DBMS

Chạy lần lượt từ gốc repo sau khi hai lab sẵn sàng và backend đã build. Chuẩn bị
sẵn JSON lịch sử ở từng chương. Khi thu lượt mới, lưu stdout vào tệp riêng ngoài repo
để giữ nguyên số liệu đã cam kết. Lưu cùng commit, phiên bản, máy, cấu hình và mã thoát.

| Người trình bày | Lệnh | Bằng chứng cần mở |
|---|---|---|
| **A — Đạt · 3.2 Storage & management** | `node experiments/storage/run.cjs` | `validation: PASS` sau năm pha rỗng, 1.000, 5.000, mở rộng payload và xóa nửa. Đối chiếu giá trị logic trước khi giải thích dung lượng và cấp phát. Dành riêng thời gian chạy Storage vì MongoDB dùng `fsync` trong phép đo. [Chương 3.2](3-2-storage.md) · [JSON](../../experiments/storage/results-initial.json) |
| **B — Tuấn · 3.3 Indexing** | `node experiments/indexing/run.cjs`<br>`node experiments/indexing/run.cjs --index-size`<br>`node experiments/indexing/run.cjs --update-cost` | Cùng 10.000 sản phẩm, truy vấn SKU trả 1 dòng và lọc hãng + giá trả 11 dòng trước/sau. Chỉ rõ scan → index, dung lượng tăng thêm và chi phí cập nhật 1.000 giá. [Chương 3.3](3-3-indexing.md) · [JSON query plan](../../experiments/indexing/results-repeated.json) |
| **C — Khánh · 3.4 Query processing** | `node experiments/query-processing/run.cjs` | Hai hệ khớp baseline. Lọc trả 26 SKU, chưa từng bán trả 600 SKU, doanh thu 599.942.000 VND. Mở EXPLAIN trước/sau để chỉ lượng dòng/key/document đã xét và giải thích join hoặc `$lookup`. [Chương 3.4](3-4-query-processing.md) · [JSON](../../experiments/query-processing/results-local.json) |
| **D — Nam · 3.5 Transaction** | `node --env-file=.env.docker experiments/transactions/run.cjs` | Kiểm chứng 10 ca trên hai hệ. Chỉ lỗi giữa chừng được rollback, hủy lặp không hoàn tồn thêm và ca đối chứng vi phạm bất biến khi bỏ transaction. Lượt đã lưu đạt 38/38 kiểm tra. [Chương 3.5](3-5-transaction.md) · [JSON](../../experiments/transactions/results-local.json) |
| **E — Hải · 3.6 Concurrency control** | `node experiments/concurrency/stock-ucs/run.cjs all --save`<br>Bash tương đương `bash experiments/concurrency/run-role-e.sh stock-ucs` | Mục tiêu 32/32 mỗi DBMS, `runs[]` cùng `PASS`, JSON mới dưới `role-e-results/`. Chỉ ca tranh món cuối, đọc snapshot trong lúc phiên khác commit và kiểm kê xen bán. Lượt chạy chung ngày 24/11 đạt 32/32 ở từng hệ. [JSON tổng duyệt](evidence/concurrency-all-2026-11-24.json). Bằng chứng ngày 22/11 ghi hai lượt đạt riêng từng hệ. [Chương concurrency](../../experiments/concurrency/Bao_cao_concurrency.md) · [JSON MySQL, `runs[0]`](../../experiments/concurrency/evidence/2026-11-22/uc-all-2026-11-22T01-53-51-093Z-52dbb0.json) · [JSON MongoDB lượt riêng](../../experiments/concurrency/evidence/2026-11-22/uc-mongodb-2026-11-22T02-29-31-496Z-2e5ea0.json) |

## 4. Backup/restore trên hai hệ · B chạy, E kiểm chứng

Hai lệnh chạy độc lập. Mỗi lệnh tạo nguồn fixture và đích lab mới có tên riêng,
dump và restore rồi đối chiếu. Chạy từng lệnh từ gốc repo, lần lượt trên `mysql-lab`
và `mongo-lab` đã khởi tạo `rs0 PRIMARY`.

**PowerShell**

```powershell
$compose = @('compose','--env-file','.env.docker','-f','compose.local.yaml')
Get-Content -Raw ./experiments/backup-restore/mysql.sh | docker @compose exec -T mysql-lab bash -o pipefail -c "tr -d '\r' | bash"
Get-Content -Raw ./experiments/backup-restore/mongodb.sh | docker @compose exec -T mongo-lab bash -o pipefail -c "tr -d '\r' | bash"
```

**Bash**

```bash
docker compose --env-file .env.docker -f compose.local.yaml exec -T mysql-lab bash -o pipefail -c "tr -d '\r' | bash" < experiments/backup-restore/mysql.sh
docker compose --env-file .env.docker -f compose.local.yaml exec -T mongo-lab bash -o pipefail -c "tr -d '\r' | bash" < experiments/backup-restore/mongodb.sh
```

Đối chiếu mã thoát (`$LASTEXITCODE` trong PowerShell, `$?` trong Bash) và dòng `PASS`
của **từng hệ**. Ghi lại `Source=`, `Target=`, `Files=`. Mở `before.tsv`/`after.tsv`
(MySQL) hoặc `before.json`/`after.json` (MongoDB) từ vị trí `Files=` trong container.
Cả hai hệ phải khớp nguồn và đích ở sáu giá trị **2 sản phẩm, 1 đơn xác nhận,
2 dòng đơn, 2 bản ghi tồn, tổng tồn 11, tổng tiền 1.830.000 VND**. MongoDB báo phục hồi
5 document, 0 lỗi. Giữ log/byte dump để kiểm chứng lượt chạy. MySQL dùng
`mysqldump --single-transaction`, MongoDB dùng `mongodump --archive` và ánh xạ namespace
sang đích sạch. [Chương 3.7](3-7-backup-restore.md) · [Kiểm chứng MySQL của E](../../experiments/concurrency/evidence/restore-mysql.log) · [Kiểm chứng MongoDB của E](../../experiments/concurrency/evidence/restore-mongodb.log)

## 5. Việc cần xác nhận trong buổi tổng duyệt 25–27/11

- **A và E** ghi lại commit, máy và kết quả của lượt chạy đầy đủ từ checkout sạch, gồm luồng UI thật và đủ năm bài lab. Xác minh Docker Compose từ đầu trên máy thành viên thứ hai, gồm cả restore. Hải đã có lượt đối chiếu restore độc lập trong môi trường cô lập từ image ghim. [Kế hoạch](../plan.md) · [Kiểm tra môi trường](../../KIEM-TRA.md) · [Chương 3.7](3-7-backup-restore.md)
- **Các owner** giữ bằng chứng mới của phần mình, ghi lỗi hoặc bước còn hở. Ghi rõ khi dùng kết quả lịch sử thay cho lượt live. Phạm vi phải nói rõ gồm UC09/10/12 đang ở lab, xác thực token local, UC03 mới có xem/thêm/sửa và các quy tắc hủy/doanh thu còn theo đề xuất. [Sổ quyết định](../../agent/decisions.md) · [Phân công](../ownership.md)
- **A** xác nhận giờ LMS và thời lượng trình bày. **E** đối chiếu ZIP với bản cả nhóm đã kiểm tra. [Yêu cầu nộp](../requirements.md#rubric-và-đầu-ra)
