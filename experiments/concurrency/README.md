# Thực nghiệm Role E · UC09, UC10, UC12 và kiểm soát đồng thời

Bộ tích hợp trong `mysql/`, `mongodb/` và `stock-ucs/` chạy cùng 32 kiểm tra trên MySQL và MongoDB. Bắt đầu tại thư mục có `compose.local.yaml`. Bản ZIP mới đã chứa toàn bộ source. Nếu đang làm trên checkout của nhóm, thư mục `experiments/concurrency/` chứa cả mã mới và bộ demo cũ. Báo cáo kết quả và đầu việc của từng thành viên nằm trong [mục 3.6](../../docs/report/3-6-concurrency.md).

## Mã nguồn theo hệ quản trị

- MySQL: [bộ chạy](mysql/stock-ucs.cjs), [nghiệp vụ kho](mysql/stock-operations.cjs), [schema lab](mysql/stock-ucs-schema.sql). Bộ chạy dùng lại store UC02/04/07/08 trong backend.
- MongoDB: [giao dịch và truy vấn UC09/10/12](mongodb/stock-ucs.js).
- Hai hệ dùng chung [32 ca kiểm tra](stock-ucs/cases.js) và [điểm khởi chạy](stock-ucs/run.cjs).

## Chạy bộ mới trên Mac

Trên máy đã làm lab E trước đây, dùng `.env.docker`, tài khoản lab và replica set `rs0` đã khởi tạo. Khi chuẩn bị máy lần đầu, làm theo [hướng dẫn macOS](../../setup-local-docker-macos.md) hoặc [hướng dẫn Windows](../../setup-local-docker.md). Các lệnh dưới đây cài thư viện đã khóa phiên bản, build backend và chạy bộ kiểm tra từ gốc repo.

```bash
export DOCKER_DEFAULT_PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"
docker compose --env-file .env.docker -f compose.local.yaml up -d mysql-lab mongo-lab
npm ci --prefix backend
npm run build --prefix backend
bash experiments/concurrency/run-role-e.sh stock-ucs
```

Lệnh cuối chạy lần lượt hai hệ, in JSON và lưu một tệp mới trong `role-e-results/uc-all-*.json`. Mỗi kiểm tra có `id`, `expected`, `actual` và `passed`. Mỗi hệ có trạng thái riêng. `PASS` ở chế độ `all` yêu cầu cả hai hệ hoàn tất cùng danh sách kiểm tra. Xem `runs[].error` nếu có `NOT_RUN` hoặc `FAIL`. Lỗi ở một hệ vẫn cho phép hệ còn lại chạy. Khi đã có `dist` từ bản build đúng source, có thể chạy lại chỉ với lệnh Bash cuối.

| Muốn chạy | Lệnh từ gốc repo |
|---|---|
| Chỉ MySQL, lưu kết quả | `bash experiments/concurrency/run-role-e.sh stock-ucs mysql --save` |
| Chỉ MongoDB, lưu kết quả | `bash experiments/concurrency/run-role-e.sh stock-ucs mongodb --save` |
| Đối chiếu trên máy chỉ có Node.js | `node experiments/concurrency/stock-ucs/run.cjs reference --save` |
| Windows với PowerShell, cả hai hệ | `node experiments/concurrency/stock-ucs/run.cjs all --save` |

Chế độ đối chiếu dùng `node:sqlite` tích hợp sẵn, cần Node.js từ 22.13 trở lên có module này. Chế độ MySQL tái sử dụng gói `mysql2` và code backend đã build của repo. Chế độ MongoDB dùng `mongosh` trong container. Thêm `--save` để giữ JSON trên đĩa khi gọi từng chế độ.

Ngày 22/11, MySQL 8.4.13 và MongoDB 8.0.34 đều đạt 32/32 trên Mac của Hải. MongoDB đạt ở lượt chạy riêng sau khi sửa lệnh gọi. [JSON có kết quả MySQL](evidence/2026-11-22/uc-all-2026-11-22T01-53-51-093Z-52dbb0.json) · [JSON MongoDB](evidence/2026-11-22/uc-mongodb-2026-11-22T02-29-31-496Z-2e5ea0.json)

## Dữ liệu và cách đọc kết quả

| Hạng mục | Thiết kế |
|---|---|
| Dữ liệu ban đầu | MySQL nạp migration/seed 001–003 lên database ngẫu nhiên mới `partstock_e_*` trong dịch vụ `mysql-lab` tại `127.0.0.1:3308`. `fixture.json` tái hiện 5 SKU và 7 biến động tương ứng cho MongoDB và bản đối chiếu. |
| Tạo dữ liệu giao dịch | MySQL gọi trực tiếp các store sản phẩm, nhập và bán của ứng dụng. MongoDB dùng collection theo tiền tố riêng, phiếu có dòng nhúng, tồn và sổ biến động tách collection. Cả hai tạo thêm SKU `E-COUNT-01`. |
| UC09 | Kiểm tra mã chứng từ, số dư theo `[từ, đến)`, bộ lọc loại biến động, kỳ rỗng và kỳ sai. Đọc lại cùng snapshot trong khi phiên khác commit bán hàng. |
| UC10 | Kiểm tra dưới/bằng/trên ngưỡng, ngưỡng bằng 0, thiếu cấu hình, ngưỡng sai và danh sách rỗng. Theo dõi một SKU bật/tắt cảnh báo khi bán/hủy. |
| UC12 | Kiểm tra dữ liệu bắt buộc, lưu phiếu không chênh lệch, áp chênh lệch lên tồn hiện tại, xác nhận lặp, hai phiếu cùng mốc, rollback và thử lại, từ chối tồn âm. |
| Đồng thời | Hai phiên xác nhận cùng phiếu, một phiên xem kết quả khi giao dịch đang mở. Hai đơn tranh món cuối. Một phiếu kiểm kê và một đơn bán cùng cập nhật một SKU. Với các giao dịch có thể hoàn tất theo hai thứ tự, kiểm tra chấp nhận cả hai thứ tự hợp lệ. |
| Phạm vi lab | Phiếu thử có một dòng sản phẩm. Runner bổ sung bảng/cột của E trong database tạm, sau đó dọn đúng database hoặc các collection mà lượt chạy vừa tạo. Một lượt còn sót sau khi tiến trình bị buộc dừng không được tái sử dụng bởi lượt tiếp theo. |

Nguồn đối chiếu là [32 kết quả thực chạy](evidence/stock-ucs-reference.json), [ba lượt đối chiếu liên tiếp](evidence/stock-ucs-reference-repeats.json), [trạng thái chạy hai hệ đích ngày 21/11](evidence/stock-ucs-target-status.json) và [bằng chứng trên Mac ngày 16/11](Bao_cao_concurrency.md). Để tích hợp với code của nhóm, xem [logic SQL của E](mysql/stock-operations.cjs), [phần mở rộng schema của lab](mysql/stock-ucs-schema.sql) và [các điều kiện được kiểm tra](stock-ucs/cases.js).

## Chạy từng demo với `mysql`, `mongodb` và `uc`

Hải đã chạy lại cả ba chế độ ngày 21/11. Mỗi log kết thúc bằng `PASS`. Để lấy kết quả bộ 32 kiểm tra trên hai hệ, dùng lệnh `stock-ucs` ở đầu trang. [MySQL](evidence/2026-11-21/mysql.log) · [MongoDB](evidence/2026-11-21/mongodb.log) · [UC09/10/12 trên MySQL](evidence/2026-11-21/mysql-uc.log)


### 1. Chuẩn bị repo và lab

Mở Terminal tại gốc dự án. Cần Bash, OpenSSL, Docker Desktop hoặc Docker Engine có Compose v2.

Chuẩn bị `.env.docker` và MongoDB keyfile theo [hướng dẫn Docker của repo](../../setup-local-docker.md). Sau đó khởi động hai dịch vụ lab.

```bash
export DOCKER_DEFAULT_PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"
dc() { docker compose --env-file .env.docker -f compose.local.yaml "$@"; }
dc up -d mysql-lab mongo-lab
dc ps mysql-lab mongo-lab
```

Hoàn tất bước khởi tạo `rs0` và tài khoản lab theo hướng dẫn repo. Kiểm tra vai trò MongoDB trước khi chạy.

```bash
dc exec -T mongo-lab mongosh --quiet 'mongodb://127.0.0.1:27017/?directConnection=true' \
  --eval 'const h = db.hello(); printjson({setName: h.setName, primary: h.isWritablePrimary});'
```

Kết quả cần thấy là `setName: 'rs0'` và `primary: true`. Có thể chạy hai chế độ MySQL trong lúc chuẩn bị MongoDB.

### 2. Chạy và lưu log

Chạy các lệnh sau từ gốc PartStock bằng Bash. `pipefail` giữ mã thoát của bộ kiểm thử khi ghi log qua `tee`.

```bash
mkdir -p role-e-results
set -o pipefail
bash experiments/concurrency/run-role-e.sh mysql   2>&1 | tee role-e-results/mysql.log
bash experiments/concurrency/run-role-e.sh mongodb 2>&1 | tee role-e-results/mongodb.log
bash experiments/concurrency/run-role-e.sh uc      2>&1 | tee role-e-results/mysql-uc.log
```

| Chế độ | Kiểm tra đạt khi |
|---|---|
| `mysql`, `mongodb` | Hai đơn nháp tranh mua 1 GPU. Một đơn trả `CONFIRMED`, đơn kia trả `OUT_OF_STOCK` và vẫn là `DRAFT`. Xác nhận lại đơn thắng trả `ALREADY_CONFIRMED`. Tồn cuối bằng `0`, phiên bản tồn tăng đúng một lần và có đúng một biến động xuất kho gắn với đơn thắng. Cuối log in `PASS`. |
| `uc` | UC10 chỉ trả SKU dưới ngưỡng. UC12 xử lý số đếm bằng tồn, điều chỉnh hợp lệ và số đếm cũ. UC09 đọc đúng biến động điều chỉnh. Ca riêng chụp tồn trước khi bán rồi xác nhận kiểm kê sau khi bán phải trả `STALE_COUNT`, giữ tồn `0` và chỉ có biến động bán hàng. Cuối log in `PASS`. |

Thứ tự log A rồi B do script in theo tên đơn. Đơn thắng tùy lần chạy. MySQL giữ giao tác mở khoảng 3 giây để hai phiên có cơ hội tranh cùng dòng tồn. MongoDB giữ giao tác khoảng 3 giây và in số lần callback chạy lại. Đây là bài kiểm thử tính đúng nghiệp vụ. Thời gian chờ chủ động làm thời lượng chạy không phù hợp để so sánh hiệu năng DBMS.

### 3. Nếu chạy lỗi

| Dấu hiệu | Kiểm tra |
|---|---|
| Docker báo service chưa chạy | Dùng `dc ps` và `dc logs --tail 60 mysql-lab mongo-lab`. |
| MongoDB báo thiếu PRIMARY hoặc lỗi xác thực | Kiểm tra `db.hello()`, bước khởi tạo `rs0` và tài khoản `partstock_lab` trong hướng dẫn repo. |
| MySQL báo lỗi procedure hoặc quyền | Kiểm tra đang dùng đúng image MySQL của PartStock và tài khoản lab có quyền tạo bảng, tạo và thực thi procedure trong `partstock_lab`. |
| Kết quả khác bảng trên | Giữ toàn bộ log, mã `Role E run` và phiên bản DBMS để đối chiếu đúng dữ liệu của lần chạy. |

MySQL giữ dữ liệu theo `run_id`, MongoDB theo `runId`. Mỗi lần chạy dùng mã mới. Chế độ `uc` có hai mã vì tách ca điều chỉnh và ca bán xen giữa.
