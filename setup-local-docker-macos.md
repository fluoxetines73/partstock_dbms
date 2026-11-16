# PartStock: mỗi người chạy Docker trên máy riêng (macOS)

Đây là bộ cấu hình đề xuất để đưa nhóm review. Ngày 04/11/2026 đã kiểm tra ba container healthy, transaction và persistence hai hệ trên một máy; người thực hiện xác nhận kết nối DBeaver thành công. Xem [KIEM-TRA.md](KIEM-TRA.md) để biết nguồn và phạm vi kiểm chứng. Phiên bản và topology chưa trở thành quyết định chung của nhóm. Bộ cấu hình Docker này phục vụ kiểm tra môi trường. Các migration và ứng dụng trong repo có hướng dẫn riêng.

Mỗi thành viên có database và mật khẩu riêng trên máy mình. Dữ liệu không tự đồng bộ giữa các máy. Cả nhóm chia sẻ cấu hình, script, schema/seed được duyệt và hướng dẫn qua Git.

Bản gốc đã được thực hiện trên Windows với Docker Desktop và image `linux/amd64`. Bản này chuyển các bước sang Terminal macOS, giữ cấu hình Docker của repo và dùng cùng kiến trúc image. Kết quả chạy Docker trên macOS còn cần xác nhận trên máy Mac.

## 1. Bật Docker Desktop

Cài [Docker Desktop cho macOS](https://docs.docker.com/desktop/setup/install/mac-install/), chọn bản **Apple silicon** cho Mac dòng M hoặc **Intel chip** cho Mac Intel. Mở Docker Desktop từ Applications và chờ engine sẵn sàng.

Mở Terminal rồi chạy từng lệnh.

```bash
uname -m
docker version
docker compose version
openssl version
```

Terminal chạy native trên Mac dòng M hiện `arm64`. `docker version` cần hiện cả phần Client và Server. Docker Desktop chạy các container Linux cho MySQL và MongoDB.

## 2. Lấy cấu hình từ GitHub

Clone repo tại nơi muốn lưu dự án.

```bash
git clone --branch main https://github.com/fluoxetines73/partstock_dbms.git
cd partstock_dbms
```

Cấu hình setup đã được merge vào `main`. Nếu repo đã có sẵn, giữ các thay đổi đang làm và lấy bản cập nhật theo quy trình Git của nhóm.

Các file cấu hình/script được lưu trong repo:

```text
partstock_dbms/
├── compose.local.yaml
├── .env.docker.example
└── database/
    └── local/
        ├── prepare.ps1
        ├── init-mongo.js
        ├── check-mongo.js
        └── check-mysql.sql
```

Đặt bản macOS cạnh [setup-local-docker.md](setup-local-docker.md) tại gốc repo. Bộ cấu hình dùng `.env.docker` riêng, không thay thế `.env` hay `.env.example` sẵn có.

Nếu đã có repo, mở Terminal tại thư mục chứa `compose.local.yaml`. Ví dụ, nếu repo nằm trong Downloads:

```bash
cd ~/Downloads/partstock_dbms
```

## 3. Tạo cấu hình và khóa riêng cho máy

Dán cả khối lệnh sau vào Terminal, gồm dòng `PARTSTOCK_SETUP` cuối cùng. Khối lệnh thực hiện bước chuẩn bị tương ứng với `prepare.ps1` trong bản gốc.

```bash
bash <<'PARTSTOCK_SETUP'
set -euo pipefail
umask 077
test -f compose.local.yaml
test -f .env.docker.example

temp_dir=$(mktemp -d ./.partstock-setup.XXXXXX)
trap 'rm -rf "$temp_dir"' EXIT

if [[ ! -e .env.docker ]]; then
  cp .env.docker.example "$temp_dir/env"
  chmod 600 "$temp_dir/env"
  for name in APP_MYSQL_PASSWORD APP_MYSQL_ROOT_PASSWORD \
    LAB_MYSQL_PASSWORD LAB_MYSQL_ROOT_PASSWORD MONGO_ROOT_PASSWORD MONGO_LAB_PASSWORD
  do
    marker="__${name}__"
    if ! grep -q "^${name}=${marker}$" "$temp_dir/env"; then
      printf 'Thiếu biến mẫu %s trong .env.docker.example\n' "$name" >&2
      exit 1
    fi
    password=$(openssl rand -hex 24)
    sed "s/${marker}/${password}/g" "$temp_dir/env" > "$temp_dir/env.next"
    mv "$temp_dir/env.next" "$temp_dir/env"
  done
  ln "$temp_dir/env" .env.docker
  printf '%s\n' 'Đã tạo .env.docker'
else
  printf '%s\n' 'Giữ .env.docker hiện có'
fi

if [[ ! -e .mongodb/keyfile ]]; then
  mkdir -p .mongodb
  openssl rand -base64 756 | tr -d '\r\n' > "$temp_dir/keyfile"
  test -s "$temp_dir/keyfile"
  ln "$temp_dir/keyfile" .mongodb/keyfile
  printf '%s\n' 'Đã tạo .mongodb/keyfile'
else
  printf '%s\n' 'Giữ .mongodb/keyfile hiện có'
fi
PARTSTOCK_SETUP
```

Script tạo:

- `.env.docker`: sáu mật khẩu ngẫu nhiên riêng cho app, lab và quản trị.
- `.mongodb/keyfile`: khóa xác thực nội bộ MongoDB replica set.

Chạy lại sẽ giữ các file đã có; script không cài phần mềm, không khởi động container và không reset dữ liệu. `.gitignore` đã giữ công khai `.env.docker.example` và bỏ qua `.env.docker`, `.mongodb/`. Mỗi người tự chạy khối chuẩn bị trên máy mình và giữ riêng hai file này. Nếu dùng lại volume cũ, dùng đúng mật khẩu và keyfile của volume đó.

## 4. Kiểm tra cấu hình và khởi động

Trong mỗi tab Terminal dùng để chạy Docker Compose cho PartStock, đặt kiến trúc image như dưới đây. Trên Apple silicon, Docker Desktop chạy image `linux/amd64` qua mô phỏng.

```bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64
```

Chạy từng lệnh và chỉ sang lệnh tiếp theo khi lệnh trước thành công.

```bash
docker compose --env-file .env.docker -f compose.local.yaml config --quiet
docker compose --env-file .env.docker -f compose.local.yaml pull
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait
docker compose --env-file .env.docker -f compose.local.yaml ps
```

- `config --quiet`: kiểm tra cấu hình mà không in mật khẩu.
- `pull`: tải image; lần đầu cần Internet và có thể lâu.
- `up`: tạo và chạy môi trường.
- `ps`: xem trạng thái ba dịch vụ; kết quả mong đợi là `healthy`.

| Dịch vụ | Từ máy cá nhân | Database | User thường |
|---|---|---|---|
| mysql-app | 127.0.0.1:3307 | partstock | partstock_app |
| mysql-lab | 127.0.0.1:3308 | partstock_lab | partstock_lab |
| mongo-lab | 127.0.0.1:27018 | partstock_lab | partstock_lab, tạo ở bước 5 |

Hai MySQL có tài khoản, volume và mạng riêng. MongoDB chỉ dành cho lab. Cổng chỉ gắn với `127.0.0.1` nên dùng trên máy hiện tại; đây không phải cấu hình chia sẻ database qua Internet.

MongoDB `healthy` ở bước này xác nhận server có xác thực và cấu hình replica set đã chạy. Chưa có nghĩa replica set đã được khởi tạo hoặc transaction đã đạt: cần bước 5–6.

## 5. Khởi tạo MongoDB replica set và user lab

Đề xuất dùng replica set một node cho lab phát triển nhỏ. Nó phục vụ thử transaction, không cung cấp bản sao dự phòng/failover. B–D cần chạy kiểm chứng và thống nhất topology trước khi dùng trong báo cáo.

Mở `.env.docker` trong trình soạn thảo để xem `MONGO_ROOT_PASSWORD`, rồi chạy:

```bash
docker compose --env-file .env.docker -f compose.local.yaml exec mongo-lab mongosh 'mongodb://127.0.0.1:27017/admin?directConnection=true' --username admin --authenticationDatabase admin --file /opt/partstock/init-mongo.js --password
```

Khi được hỏi, nhập `MONGO_ROOT_PASSWORD`; mật khẩu không hiển thị khi gõ. Không thêm mật khẩu thật vào lệnh chia sẻ với nhóm.

Script kiểm tra đúng môi trường, khởi tạo `rs0`, chờ PRIMARY, tạo user `partstock_lab` với quyền `readWrite` trên `partstock_lab`. Có thể chạy lại; nếu user đã tồn tại thì không tự đổi mật khẩu/quyền. Những bài thực nghiệm cần thêm quyền quản trị sẽ được cấp riêng theo nhu cầu, không dùng admin làm tài khoản mặc định.

Kết quả mong đợi có dòng `Replica set rs0 is PRIMARY...`. Kết quả trên máy người chuẩn bị đã được ghi trong KIEM-TRA.md; mỗi thành viên vẫn phải kiểm tra lại trên máy mình.

## 6. Kiểm tra thực tế trước khi bàn giao

### MySQL app: đăng nhập và truy vấn đơn giản

```bash
docker compose --env-file .env.docker -f compose.local.yaml exec mysql-app mysql -u partstock_app -p partstock
```

Nhập `APP_MYSQL_PASSWORD`, rồi trong cửa sổ MySQL:

```sql
SELECT VERSION(), DATABASE(), CURRENT_USER();
SHOW TABLES;
exit
```

Database là `partstock`. Volume mới có thể chưa có bảng cho đến khi chạy migration của ứng dụng.

### MySQL lab: commit và rollback

```bash
docker compose --env-file .env.docker -f compose.local.yaml exec mysql-lab mysql -u partstock_lab -p partstock_lab
```

Nhập `LAB_MYSQL_PASSWORD`, rồi chạy trong MySQL:

```sql
SOURCE /opt/partstock/check-mysql.sql;
exit
```

Kỳ vọng có hai dòng `PASS`, không có lỗi. Script chỉ tạo bảng TEMPORARY trong phiên kết nối lab, kiểm tra rollback/commit hai dòng rồi dọn bảng. Đây là kiểm tra hạ tầng, chưa chứng minh giao dịch bán hàng PartStock.

### MongoDB lab: transaction hai document

```bash
docker compose --env-file .env.docker -f compose.local.yaml exec mongo-lab mongosh "mongodb://127.0.0.1:27017/partstock_lab?replicaSet=rs0&directConnection=true" --username partstock_lab --authenticationDatabase partstock_lab --file /opt/partstock/check-mongo.js --password
```

Nhập `MONGO_LAB_PASSWORD`. Kỳ vọng hai dòng `PASS` cho rollback và commit. Script dùng hai document kiểm tra có ID riêng và dọn đúng hai document đó, không reset lab. Nếu có lỗi, giữ log lỗi để xử lý; không đánh dấu môi trường đạt.

### Kiểm tra tách quyền

Thử đăng nhập vào `mysql-lab` bằng user app:

```bash
docker compose --env-file .env.docker -f compose.local.yaml exec mysql-lab mysql -u partstock_app -p partstock_lab
```

Nhập mật khẩu app. Kỳ vọng bị từ chối, vì đây là MySQL server lab riêng và không có tài khoản app. Ghi lại kết quả thực tế.

### Kiểm tra dữ liệu tồn tại sau khởi động lại

Mở lại MySQL lab bằng lệnh ở phần kiểm tra commit và rollback, rồi tạo dữ liệu kiểm tra riêng.

```sql
CREATE TABLE IF NOT EXISTS _partstock_persistence_check (
  id INT PRIMARY KEY, note VARCHAR(50) NOT NULL
) ENGINE=InnoDB;
INSERT INTO _partstock_persistence_check VALUES (1, 'before-restart')
ON DUPLICATE KEY UPDATE note = 'before-restart';
```

Đăng nhập MongoDB lab bằng lệnh ở trên nhưng bỏ `--file /opt/partstock/check-mongo.js`, rồi chạy:

```javascript
db.getCollection("_partstock_persistence_check").updateOne(
  { _id: "local" },
  { $set: { note: "before-restart" } },
  { upsert: true }
)
exit
```

Thoát cả hai shell trước khi gỡ và tạo lại container. Dùng `down` không kèm `-v` để giữ volume.

```bash
docker compose --env-file .env.docker -f compose.local.yaml down
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait
```

Kết nối lại MySQL lab, chạy `SELECT * FROM _partstock_persistence_check;`. Kết nối lại MongoDB lab, chạy `db.getCollection("_partstock_persistence_check").findOne({_id:"local"})`. Cả hai phải còn `before-restart`. Đây chỉ là dữ liệu kiểm tra lab; không phải seed nghiệp vụ. Chạy lại kiểm tra transaction để xác minh replica set dùng được sau tạo lại container.

Tên collection bắt đầu bằng `_` cần truy cập rõ bằng `db.getCollection(...)` trong mongosh. Trên phiên bản đã kiểm tra, `db._partstock_persistence_check` là `undefined`; đây là lỗi truy cập đối tượng trong shell, không phải lỗi kết nối hay mất dữ liệu. Xem https://www.mongodb.com/docs/manual/reference/limits/#restriction-on-collection-names.

## 7. Kết nối DBeaver

Tạo ba connection, đặt tên rõ `PartStock - MySQL APP`, `PartStock - MySQL LAB`, `PartStock - MongoDB LAB`.

MySQL: chọn driver MySQL, dùng host/port/database/user trong bảng bước 4; password lấy từ `.env.docker`. Root không dùng cho kết nối làm việc thường ngày.

MongoDB: dùng driver MongoDB của bản hỗ trợ (Enterprise có), host `127.0.0.1`, port `27018`. Trong Authentication chọn `MongoDB authentication`; Mechanism chọn `SCRAM-SHA-256` để bật ô Username. Source/authentication database là `partstock_lab`, Username là `partstock_lab`, Password là giá trị `MONGO_LAB_PASSWORD`. Database làm việc là `partstock_lab`. Đặt connection options:

```text
replicaSet=rs0
directConnection=true
```

Nếu dùng chế độ URL, điền URL không chứa username/password sau đây; vẫn nhập tài khoản và mật khẩu trong phần Authentication như trên:

```text
mongodb://127.0.0.1:27018/partstock_lab?authSource=partstock_lab&replicaSet=rs0&directConnection=true
```

Chọn Test Connection rồi Finish nếu thành công. Trong MongoDB mở collection `_partstock_persistence_check` để đối chiếu document đã tạo khi thử persistence. Không dùng Mechanism NONE: đây là chế độ không xác thực, ô Username sẽ không cho nhập ở giao diện đã kiểm tra.

Port `27018` dành cho chương trình trên macOS. Lệnh mongosh chạy **bên trong container** dùng `27017`; hai địa chỉ này khác vị trí truy cập. Backend chạy trong container sau này sẽ dùng tên service và cổng nội bộ, không lấy `127.0.0.1:3307` làm host database.

## 8. Cố định image để cả nhóm dùng cùng bản

`.env.docker.example` đã cố định theo digest của image thực sự chạy đạt trên máy chuẩn bị:

| Image | Phiên bản server đã kiểm chứng | Digest |
|---|---|---|
| MySQL | 8.4.13 | `mysql@sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902` |
| MongoDB | 8.0.34 | `mongo@sha256:b9924c330a8bbc5800fe9c69f04a84e221eca7b28fd049a0354147d9908fa142` |

Thành viên mới chạy khối chuẩn bị ở bước 3 sẽ nhận hai giá trị này. Người đã có `.env.docker` từ mẫu cũ cần cập nhật riêng hai dòng PARTSTOCK_MYSQL_IMAGE/PARTSTOCK_MONGO_IMAGE từ mẫu mới nếu muốn đồng nhất; giữ nguyên mật khẩu và keyfile đang dùng. Không xóa volume hoặc tạo lại credential để đổi tên image.

Tag `mysql:8.4` và `mongo:8.0` có thể trỏ tới patch mới theo thời gian. Sau khi bật các lab, kiểm tra image đang chạy và kiến trúc của nó.

```bash
for service in mysql-lab mongo-lab; do
  container_id=$(docker compose --env-file .env.docker -f compose.local.yaml ps -q "$service")
  image_id=$(docker inspect --format '{{.Image}}' "$container_id")
  docker image inspect "$image_id" --format '{{.Os}}/{{.Architecture}} {{json .RepoDigests}}'
done
```

Khi cập nhật image trong tương lai, kiểm chứng trước rồi ghi digest, phiên bản server, hệ điều hành/kiến trúc và topology vào `agent/decisions.md` ở trạng thái đúng. Nếu nhóm có cả ARM và x86, kiểm tra digest/image hỗ trợ từng kiến trúc trước khi sử dụng.

Sau này người khác lấy mẫu đã cố định image, tự chạy các bước chuẩn bị, khởi động, khởi tạo và kiểm tra. Không phân phối file mật khẩu của bạn.

## 9. Dùng hằng ngày và theo dõi dung lượng

Khởi động:

```bash
docker compose --env-file .env.docker -f compose.local.yaml up -d --wait
```

Dừng, giữ dữ liệu:

```bash
docker compose --env-file .env.docker -f compose.local.yaml stop
```

Xem trạng thái, dung lượng Docker và tài nguyên đang sử dụng:

```bash
docker compose --env-file .env.docker -f compose.local.yaml ps
docker system df
docker stats --no-stream
```

Volume giữ dữ liệu khi container bị gỡ. Không thêm `-v` vào `down` như một bước reset lab: cấu hình này có cả volume app, nên thao tác đó có thể xóa cả dữ liệu ứng dụng. Bộ mẫu không cung cấp lệnh reset phá dữ liệu; khi cần phải tách đúng đích lab và kiểm tra trước.

Không cần bật các dịch vụ khi không sử dụng. Cấu hình không đặt tự khởi động lại; mở Docker Desktop không có nghĩa mọi database phải luôn chạy. Log mỗi dịch vụ được giới hạn khoảng 3 file x 10 MB, nhưng data/index/oplog/volume vẫn có thể tăng; kiểm tra thực tế thay vì coi dung lượng dự phòng là giới hạn.

## 10. Nếu gặp lỗi

| Hiện tượng | Kiểm tra tiếp |
|---|---|
| Docker không kết nối engine | Mở Docker Desktop từ Applications, chờ sẵn sàng rồi kiểm tra Client/Server bằng `docker version` |
| Cổng 3307/3308 bị chiếm | Đổi APP_MYSQL_PORT/LAB_MYSQL_PORT trong .env.docker và dùng đúng cổng mới ở DBeaver |
| Cổng 27018 bị chiếm | Đổi vế cổng máy cá nhân trong ports của mongo-lab, cập nhật hướng dẫn kết nối |
| Container unhealthy/exited | Xem logs đúng dịch vụ bằng lệnh bên dưới; xử lý lỗi trước khi chạy bước kế tiếp |
| MongoDB đăng nhập được nhưng healthcheck luôn lỗi | Bản sửa ngày 04/11 chấp nhận cả `parsed.replication.replSet` và `replSetName` trong healthcheck và init-mongo.js. CLI `--replSet` trên máy đã kiểm tra trả về `replSet`; chỉ kiểm tra `replSetName` sẽ báo unhealthy sai. Lấy đủ cả hai file đã sửa, áp dụng lại riêng mongo-lab và giữ volume |
| MongoDB chưa PRIMARY | Chạy bước 5 sau khi mongo-lab healthy; xem lỗi init thay vì tự chạy rs.initiate nhiều lần |
| DBeaver không tìm được mongo-lab | Trên máy cá nhân dùng 127.0.0.1:27018 và directConnection=true |
| Đổi .env nhưng mật khẩu vẫn cũ | User đã tồn tại trong volume; sửa file không tự đổi password DB. Giữ cấu hình cũ hoặc đổi password đúng quy trình, không xóa volume app để sửa nhanh |
| MongoDB báo CPU/illegal instruction | Kiểm tra `uname -m`, biến `DOCKER_DEFAULT_PLATFORM` và log `mongo-lab` để xác định lỗi kiến trúc hoặc mô phỏng |

Ví dụ xem log MongoDB:

```bash
docker compose --env-file .env.docker -f compose.local.yaml logs --tail 100 mongo-lab
```

MySQL tương tự, thay tên dịch vụ. Che bí mật nếu có trước khi gửi log; không gửi `.env.docker` hoặc output `config` đầy đủ.

## 11. Bàn giao cho cả nhóm

- Lưu compose, mẫu env, script và hướng dẫn qua nhánh/PR của task; không tự push/merge khi chưa được yêu cầu.
- Lưu ngoại lệ `!.env.docker.example` trong .gitignore; dùng `git status --short --untracked-files=all` để xem trước file đưa vào Git.
- Không đưa `.env.docker`, `.mongodb/keyfile`, volume hay backup vào Git.
- Nhờ một người khác làm lại trên máy sạch hoặc môi trường riêng và lưu kết quả thật.
- README/database/context/decisions đã liên kết bộ môi trường này và phân biệt phần kiểm chứng cá nhân với phần chờ review; cập nhật trạng thái khi có kết quả mới. Không tự đánh dấu toàn bộ app đã có schema/seed/test nghiệp vụ.
- Chỉ ghi Done khi các bước kết nối, tách quyền, transaction và persistence đã thực sự chạy đạt. Ghi kết quả kiểm tra môi trường riêng với kết quả schema, seed nghiệp vụ và benchmark.

Reviewer ghi kết quả thử trên máy thứ hai vào KIEM-TRA.md theo bảng sau, chỉ điền khi đã chạy:

| Mục | Người kiểm tra / ngày | Kết quả thực tế / bằng chứng |
|---|---|---|
| Clone đúng nhánh và tự tạo credential | Chưa xác nhận | Chưa chạy trên máy thứ hai |
| Ba dịch vụ healthy | Chưa xác nhận | Chưa chạy trên máy thứ hai |
| MySQL/MongoDB commit và rollback | Chưa xác nhận | Chưa chạy trên máy thứ hai |
| Tách quyền app/lab | Chưa xác nhận | Chưa chạy trên máy thứ hai |
| Dữ liệu còn sau down/up không xóa volume | Chưa xác nhận | Chưa chạy trên máy thứ hai |
| Kết nối client/DBeaver theo hướng dẫn | Chưa xác nhận | Chưa chạy trên máy thứ hai |

Task này bàn giao môi trường database local và hướng dẫn tái tạo. Schema/seed nghiệp vụ, ứng dụng và các thực nghiệm chuyên đề là các công việc tiếp theo, không dùng kết quả kiểm tra hạ tầng để đánh dấu các phần đó đã hoàn thành.

## Nguồn chính thức

- [Docker Desktop cho macOS](https://docs.docker.com/desktop/setup/install/mac-install/)
- Image MySQL: https://hub.docker.com/_/mysql
- Image MongoDB: https://hub.docker.com/_/mongo
- MongoDB transaction: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- Replica set cho thử nghiệm: https://www.mongodb.com/docs/manual/tutorial/deploy-shard-cluster/ (ghi nhận khả năng single-member replica set cho testing; bộ mẫu không triển khai sharding)
- Keyfile: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/
- directConnection khi chạy Docker: https://www.mongodb.com/docs/manual/reference/connection-string-options/
- Docker volumes: https://docs.docker.com/engine/storage/volumes/
