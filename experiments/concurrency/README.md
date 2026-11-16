# Chạy kiểm thử Concurrency Control của Role E

Bộ kiểm thử chạy trên MySQL Lab và MongoDB Lab của PartStock. Mỗi ca dùng dữ liệu mẫu riêng có tiền tố `role_e_` và mã lần chạy ngẫu nhiên. [README tiến độ và kết quả](README-Role-E-Progress.md) ghi các lần đã kiểm tra và việc còn phụ thuộc schema chung.

## 1. Chuẩn bị repo và lab

Giải nén ZIP vào gốc PartStock để `experiments/concurrency/run-role-e.sh` và `compose.local.yaml` nằm dưới cùng một gốc dự án. Mở Terminal tại gốc dự án. Cần Bash, OpenSSL, Docker Desktop hoặc Docker Engine có Compose v2.

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

## 2. Chạy và lưu log

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

## 3. Nếu chạy lỗi

| Dấu hiệu | Kiểm tra |
|---|---|
| Docker báo service chưa chạy | Dùng `dc ps` và `dc logs --tail 60 mysql-lab mongo-lab`. |
| MongoDB báo thiếu PRIMARY hoặc lỗi xác thực | Kiểm tra `db.hello()`, bước khởi tạo `rs0` và tài khoản `partstock_lab` trong hướng dẫn repo. |
| MySQL báo lỗi procedure hoặc quyền | Kiểm tra đang dùng đúng image MySQL của PartStock và tài khoản lab có quyền tạo bảng, tạo và thực thi procedure trong `partstock_lab`. |
| Kết quả khác bảng trên | Giữ toàn bộ log, mã `Role E run` và phiên bản DBMS để đối chiếu đúng dữ liệu của lần chạy. |

MySQL giữ dữ liệu theo `run_id`, MongoDB theo `runId`. Mỗi lần chạy dùng mã mới. Chế độ `uc` có hai mã vì tách ca điều chỉnh và ca bán xen giữa.
