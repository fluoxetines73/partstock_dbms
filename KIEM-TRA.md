# Kiểm tra môi trường database local

## Trạng thái hiện tại — 04/11/2026

Phạm vi: một máy Windows/Docker Desktop, image linux/amd64; chưa tái tạo trên máy thành viên khác. Các mục sau là kiểm tra hạ tầng, chưa phải nghiệm thu ứng dụng hoặc thực nghiệm chuyên đề.

| Mục | Kết quả | Nguồn xác nhận |
|---|---|---|
| Ba container healthy | Đạt | Agent đọc trạng thái Docker |
| MySQL app đúng database/user | Đạt | Log người dùng gửi |
| MySQL lab commit/rollback | Đạt | Log người dùng gửi, hai dòng PASS |
| MongoDB rs0 PRIMARY, commit/rollback hai document | Đạt | Agent chạy script bằng tài khoản lab |
| MySQL/MongoDB giữ bản ghi qua tạo lại container | Đạt | Log MySQL người dùng gửi và agent đọc lại MongoDB |
| MySQL lab từ chối tài khoản app | Đạt | Agent chạy kiểm tra đăng nhập, ERROR 1045 Access denied |
| Ba kết nối DBeaver và document MongoDB | Đạt theo xác nhận người thực hiện | Người dùng báo lại; chưa đính kèm ảnh/log DBeaver |
| Review và tái tạo trên máy thứ hai | Chưa thực hiện | Chờ thành viên/reviewer xác minh |

MySQL 8.4.13, MongoDB 8.0.34. Mẫu `.env.docker.example` đã ghim digest của hai image kiểm chứng; xem hướng dẫn và agent/decisions.md. File `.env.docker` cá nhân có thể vẫn dùng tag cũ nếu đã tạo trước bản cập nhật; không sửa bí mật hoặc dữ liệu của người dùng khi cập nhật mẫu.

## Bản ghi ban đầu ngày 04/11/2026

Đã thực hiện:

- Docker Compose đọc/kiểm tra `compose.local.yaml` với `.env.docker.example`, không in credential: thành công.
- Node kiểm tra cú pháp `init-mongo.js` và `check-mongo.js`: thành công.
- PowerShell parser kiểm tra cú pháp `prepare.ps1`: thành công.
- Git status repo PartStock không có thay đổi do công việc này. Các file bộ mẫu nằm ngoài repo.

Đã phát hiện trên máy: Docker CLI 29.1.3; Docker Compose v5.0.0-desktop.1. Kết nối đến Docker Desktop Linux engine chưa thành công (không tìm thấy named pipe của engine tại lúc kiểm tra).

Chưa thực hiện:

- Tải/chạy image MySQL và MongoDB, xác minh entrypoint thực tế của image được tải.
- Chạy prepare.ps1 để tạo cấu hình/credential thật.
- Khởi tạo replica set, tạo user, kiểm tra quyền và đăng nhập DBeaver.
- Chạy SQL/MongoDB transaction và kiểm tra persistence.
- Đo dung lượng/RAM hoặc benchmark; kiểm tra trên máy thành viên khác.

Các dòng PASS nêu trong hướng dẫn/script ở bản ghi ban đầu là kết quả mong đợi. Phạm vi kiểm chứng mới được cập nhật dưới đây; không suy ra nhóm đã nghiệm thu. Phiên bản/digest/topology cần chốt đúng quy trình dự án.

## Cập nhật sau sửa lỗi MongoDB ngày 04/11/2026

Server khởi động bằng `--replSet rs0` trả về `parsed.replication.replSet = "rs0"` từ getCmdLineOpts. Bộ mẫu chỉ đọc replSetName, khiến healthcheck exit 1 và script khởi tạo cũng từ chối. Đã sửa compose.local.yaml và database/local/init-mongo.js để chấp nhận cả hai tên trường, vẫn yêu cầu rs0.

Đã thực sự chạy:

- Kiểm tra cấu hình Compose và cú pháp script init sau sửa: thành công.
- Tạo lại riêng mongo-lab với `up -d --no-deps --wait --wait-timeout 60 mongo-lab`: healthy, giữ nguyên volume.
- Chạy init-mongo.js: rs0 PRIMARY; tạo user partstock_lab với readWrite trên partstock_lab.
- Chạy check-mongo.js bằng user lab: `PASS: rollback preserved both documents.` và `PASS: commit updated both documents.` Script dọn đúng hai document thử của nó.
- Compose ps: mysql-app, mysql-lab và mongo-lab đều healthy; cổng lần lượt 127.0.0.1:3307, :3308 và :27018.

Không reset dữ liệu hoặc thay đổi hai dịch vụ MySQL. Credential được dùng bên trong container, không in hoặc ghi vào báo cáo. Nhánh sửa: codex/fix-mongodb-readiness; chưa commit/push/merge.

Tại thời điểm sửa healthcheck, chưa kiểm chứng transaction MySQL, tách quyền, persistence, DBeaver hoặc máy thành viên khác. Chưa có schema/seed nghiệp vụ hay benchmark. Image đang dùng mysql:8.4 và mongo:8.0, chưa cố định digest. Topology một node và phiên bản vẫn cần nhóm review.

## Cập nhật kiểm tra MySQL và cú pháp mongosh ngày 04/11/2026

Theo log người dùng cung cấp: MySQL 8.4.13 đăng nhập app đúng database/user; check-mysql.sql trên lab báo PASS cho rollback và commit; bảng kiểm tra persistence có dòng id=1, note=before-restart trước khi khởi động lại. MongoDB báo phiên bản 8.0.34, mongosh 2.14.0 và đang PRIMARY; db.getName() trả về partstock_lab.

Lệnh MongoDB persistence trong hướng dẫn bị lỗi vì dùng dot notation với tên collection bắt đầu bằng `_`. Đã trực tiếp kiểm tra chỉ đọc: thuộc tính theo dot notation là undefined, còn phương thức updateOne qua getCollection là function; bản ghi `_id: local` hiện chưa tồn tại. Đã sửa cả câu lệnh updateOne và findOne trong hướng dẫn sang getCollection. Không ghi/xóa dữ liệu MongoDB trong lần chẩn đoán này.

Tại thời điểm sửa cú pháp mongosh, chưa có kết quả persistence sau khởi động lại, kiểm tra tách quyền, DBeaver hoặc máy thành viên khác.

## Xác nhận persistence sau tạo lại container ngày 04/11/2026

- Theo kết quả người dùng gửi sau tạo lại container, MySQL lab vẫn có dòng id=1, note=before-restart trong _partstock_persistence_check.
- Kiểm tra trực tiếp chỉ đọc MongoDB lab sau tạo lại container: database partstock_lab, replicaSet rs0, primary=true; collection _partstock_persistence_check vẫn có document _id=local, note=before-restart.
- Compose ps cùng lần kiểm tra: cả mysql-app, mysql-lab và mongo-lab đều healthy, dùng các cổng local đã hướng dẫn.

Persistence cơ bản trên máy hiện tại đã có bằng chứng cho cả hai hệ. Tại thời điểm xác nhận persistence, chưa kiểm tra DBeaver, tách quyền hoặc tái tạo môi trường trên máy thành viên khác. Không ghi/xóa dữ liệu trong lần xác nhận này.

## Xác nhận kết nối DBeaver ngày 04/11/2026

Phạm vi: môi trường Docker local trên máy người thực hiện. Nguồn kết quả: người dùng xác nhận trong cuộc trao đổi ngày 04/11/2026 đã hoàn thành kiểm tra document MongoDB và tạo thành công hai kết nối MySQL. Đây là kết quả do người thực hiện báo lại; agent chưa trực tiếp thao tác hoặc quan sát màn hình DBeaver sau kết nối. Chưa đính kèm ảnh/log DBeaver vào mục này.

| Kết nối | Host / port | Database | Username | Kết quả |
|---|---|---|---|---|
| PartStock - APP | 127.0.0.1:3307 | partstock | partstock_app | Kết nối thành công theo xác nhận người dùng |
| PartStock - MySQL LAB | 127.0.0.1:3308 | partstock_lab | partstock_lab | Kết nối thành công theo xác nhận người dùng |
| PartStock - MongoDB LAB | 127.0.0.1:27018 | partstock_lab | partstock_lab | Kết nối thành công; người dùng xác nhận xem được document kiểm tra |

Document được đối chiếu trong MongoDB: collection `_partstock_persistence_check`, `_id: "local"`, `note: "before-restart"`.

Cách thực hiện: tạo ba connection riêng trong DBeaver bằng thông tin local đã hướng dẫn, kiểm tra kết nối và mở collection kiểm tra MongoDB. Mật khẩu lấy từ `.env.docker` trên máy cá nhân, không ghi vào tài liệu hay Git. Với MongoDB, hướng dẫn sử dụng SCRAM-SHA-256, source partstock_lab, replicaSet rs0 và directConnection=true; không dùng mechanism NONE.

Trạng thái: kiểm tra kết nối DBeaver trên máy hiện tại đạt theo xác nhận người dùng. Chưa có kết quả kiểm tra tách quyền được báo lại; chưa tái tạo môi trường trên máy thành viên khác, chưa có review nhóm hoặc nghiệm thu toàn bộ phần setup. Phiên bản/image digest và topology vẫn cần nhóm thống nhất theo agent/decisions.md.

## Chuẩn bị bàn giao nhánh setup ngày 04/11/2026

- Đã kiểm tra MySQL lab từ chối user partstock_app khi dùng đúng mật khẩu app: ERROR 1045 Access denied. Credential chỉ truyền qua stdin tới client, không in ra hoặc lưu vào báo cáo.
- Đọc RepoDigests của image đã chạy: MySQL `sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902`, MongoDB `sha256:b9924c330a8bbc5800fe9c69f04a84e221eca7b28fd049a0354147d9908fa142`; image local linux/amd64. Đã đưa vào mẫu công khai, không đổi container hay `.env.docker` cá nhân.
- Hướng dẫn thành viên đã có clone repo/nhánh PR, tự tạo secret, khởi động, init, kiểm tra transaction/quyền/persistence, kết nối DBeaver với SCRAM-SHA-256, dừng và xử lý lỗi thường gặp.
- README và tài liệu trạng thái liên quan đã liên kết hướng dẫn/kết quả, ghi đúng phần đã kiểm chứng và phần chờ review. Chưa commit, push, tạo PR hoặc merge trong lần chuẩn bị này.
- Reviewer và thành viên kiểm tra máy thứ hai chưa được chỉ định. Trước khi đánh dấu Done cần một người khác review, chạy lại hướng dẫn và bổ sung kết quả thật.
- Kiểm tra bộ file bàn giao: Compose config với mẫu ghim digest hợp lệ; hai script JavaScript và script PowerShell qua kiểm tra cú pháp; không có lỗi whitespace từ git diff --check. Đã đọc UTF-8 và kiểm tra liên kết Markdown local của 19 file dự kiến xuất bản.
- Đối chiếu nội dung 19 file công khai với các mật khẩu/keyfile thật trên máy: không có giá trị bí mật bị đưa vào. `.env.docker` và `.mongodb/keyfile` được ignore và chưa được Git theo dõi; `.env.docker.example` không bị ignore. Không in giá trị bí mật trong kiểm tra.
