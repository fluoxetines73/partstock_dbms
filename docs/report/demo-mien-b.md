# Kịch bản demo miền B — UC02–03, Indexing và Backup/restore

## Chuẩn bị từ checkout sạch

Mở PowerShell ở gốc repo của bản cần trình bày. Với máy mới, tạo `.env.docker` và khóa
MongoDB theo bước 3 trong [hướng dẫn Docker](../../setup-local-docker.md). Cài frontend và
backend từ lockfile, rồi dùng Chromium hoặc Edge hiện có theo [hướng dẫn Playwright](../../frontend/README.md).

```powershell
$compose = @('compose','--env-file','.env.docker','-f','compose.local.yaml')
docker @compose up -d --wait mysql-lab mongo-lab
docker @compose ps mysql-lab mongo-lab
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
```

Sau khi hai lab `healthy`, khởi tạo `rs0` và user lab nếu đây là lần đầu theo
[bước 5](../../setup-local-docker.md#5-khởi-tạo-mongodb-replica-set-và-user-lab). Xác nhận
MongoDB `rs0 PRIMARY`. Các ca demo dùng schema hoặc collection lab riêng. Chạy từng lệnh và
kiểm tra exit code trước khi chuyển bước.

## 1. UC02–03 qua HTTP trên MySQL lab

Script HTTP tự tạo schema lab riêng, chạy migration `001 → 002 → 003`, nạp seed `001 → 002`,
rồi gọi API thật bằng token thử. Script dọn schema sau lượt chạy.

```powershell
npm.cmd --prefix backend test
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
```

| Minh chứng | Output và dữ liệu cần trình bày |
|---|---|
| Đọc seed | `GET` trả 5 sản phẩm và 2 nhà cung cấp |
| `insert` | `POST /api/products` tạo `RAM-TEST-01` giá 450.000 VND và trả `201`. `POST /api/suppliers` tạo nhà cung cấp mẫu và trả `201` |
| Tồn ban đầu | Tra `inventory` theo ID linh kiện vừa tạo và nhận đúng một dòng bằng `0` |
| `update` | `PATCH /api/products/:id` đổi giá thành 470.000 VND. `PATCH /api/suppliers/:id` cập nhật số điện thoại. `GET` cuối đọc lại các giá trị đã lưu |
| Ràng buộc | Giá âm và FK không tồn tại trả `400`. SKU trùng trả `409`. `GET` cuối xác nhận dữ liệu chỉ đổi theo các request thành công |

Để tái tạo kiểm tra đủ seed `001`–`003` và đối chiếu khóa trên app local, xem
[kết quả kiểm chứng ngày 23/11](../../database/mysql/README.md#migration-audit).

Kịch bản trình duyệt dùng API thật, tự tạo schema MySQL lab với seed `001`–`003`
và token Quản lý kiểm thử. Khi dùng cấu hình mặc định, giải phóng hai cổng `3101` và `5174`.

```powershell
npm.cmd run build --prefix backend
npm.cmd test --prefix frontend -- managed-data.spec.js
```

Khi trình bày, có thể chạy lại bài kiểm thử với `--debug` để mở trình duyệt và đi từng bước.

1. Mở **Linh kiện**, kết nối phiên Quản lý và xem dữ liệu seed. Tạo linh kiện giá
   450.000 VND, chọn danh mục **RAM**, hãng **Kingston** và thêm thông số `{"capacity_gb":8}`.
   Sửa lên 470.000 VND, rồi tải lại trang, kết nối và đọc lại giá đã lưu.
2. Mở **Nhà cung cấp** bằng cùng phiên. Tạo nhà cung cấp có email, sửa điện thoại và
   bỏ email. Tải lại trang để kiểm tra điện thoại mới và ô email trống.
3. Thử thêm linh kiện với SKU trùng. Giao diện hiện lỗi và giữ nội dung form. Dùng kết quả
   HTTP ở trên để chỉ ra linh kiện thêm thành công có một dòng tồn bằng `0`.
4. Trên linh kiện demo đang kinh doanh, chọn **Ngừng kinh doanh** rồi xác nhận. Tải lại
   và kiểm tra linh kiện vẫn hiện trong danh sách Quản lý với trạng thái **Ngừng kinh doanh**.

[Kiểm thử HTTP](../../backend/tests-db/uc02-03.cjs) · [Kiểm thử trình duyệt](../../frontend/tests/managed-data.spec.js)

## 2. Indexing trên MySQL và MongoDB

```powershell
node experiments/indexing/run.cjs
node experiments/indexing/run.cjs --index-size
node experiments/indexing/run.cjs --update-cost
```

**Trình tự trình bày số liệu đã lưu ngày 14/11**

| Mở bằng chứng | Điểm cần giải thích |
|---|---|
| [Query plan trước/sau](../../experiments/indexing/results-repeated.json) | Với 10.000 linh kiện, tìm chính xác SKU trả **1** kết quả, lọc theo hãng và khoảng giá trả **11**. MySQL chuyển từ `Table scan` sang `Index lookup` hoặc `Index range scan`. MongoDB chuyển từ `COLLSCAN` sang `IXSCAN` và `FETCH`. Kết quả truy vấn giữ nguyên. |
| [Dung lượng index](../../experiments/indexing/results-index-size.json) | Hai secondary indexes tăng thêm **475.136 byte** trong MySQL và **241.664 byte** trong MongoDB ở lượt đo này. Giải thích cách đọc dung lượng tăng thêm so với index mặc định trong từng hệ. |
| [Chi phí cập nhật](../../experiments/indexing/results-update-cost.json) | Mỗi batch đổi 1.000 giá. Median trước/sau trong MySQL là **8,389 → 11,849 ms** và trong MongoDB là **21,755 → 24,897 ms**. Đổi giá làm đổi key của `idx_brand_price`. Chỉ `modified`, `reset` và `baselineMatches` để xác minh dữ liệu về baseline. |

Khi nói về timing, nêu **1 warm-up và 5 mẫu mỗi pha**, cache giữ nguyên và timer khác nhau giữa hai hệ.
Trong phạm vi thí nghiệm, index giảm lượng đọc, đồng thời tăng dung lượng index và chi phí cập nhật giá.
[Phương pháp và kết quả](3-3-indexing.md) · [README của lab](../../experiments/indexing/README.md)

## 3. Backup/restore trên lab

```powershell
Get-Content -Raw ./experiments/backup-restore/mysql.sh | docker @compose exec -T mysql-lab bash -o pipefail -c "tr -d '\r' | bash"
Get-Content -Raw ./experiments/backup-restore/mongodb.sh | docker @compose exec -T mongo-lab bash -o pipefail -c "tr -d '\r' | bash"
```

1. Chỉ ra dòng `Source=` và `Target=` để xác nhận nguồn và đích là hai database lab riêng.
2. Đọc baseline và output sau restore. Cả hai hệ phải khớp 2 sản phẩm, 1 đơn xác
   nhận, 2 dòng đơn, 2 bản ghi tồn, tổng tồn 11 và tổng tiền 1.830.000 VND.
3. MySQL và MongoDB đều phải in `PASS`. MongoDB báo 5 documents thành công, 0 lỗi
   vì hai dòng đơn nằm trong document đơn bán. Dòng `Files=` chỉ nơi giữ log
   và số liệu trước/sau cho người kiểm chứng.

Chỉ ra kết quả độc lập của Hải ngày 16/11. Cả hai hệ **PASS** khi đối chiếu đích lab sạch.
Lượt đó dùng môi trường cô lập từ image đã ghim. Kiểm chứng Docker Compose trên máy thành viên
thứ hai vẫn đang chờ. [Mục 3.7](3-7-backup-restore.md) · [Log restore MySQL](../../experiments/concurrency/evidence/restore-mysql.log) · [Log restore MongoDB](../../experiments/concurrency/evidence/restore-mongodb.log)

## Tổng duyệt local ngày 23/11/2026

Đã chạy trên nhánh `feat/uc02-03-management`, tại `4087437` cùng các thay đổi kiểm thử và
tài liệu trong working tree. Bản này dùng nền `main` tại `76c2ba9`, trùng với GitHub tại thời điểm kiểm tra.

- Backend đạt **11/11** bài kiểm thử và frontend build thành công.
- HTTP UC02–03 đạt trên MySQL lab. Migration `001`–`003` chạy lại không đổi schema. Mỗi
  linh kiện mới có đúng một dòng tồn bằng `0`. Đối chiếu cấu trúc ở app local bằng truy vấn chỉ đọc.
- Kiểm thử tích hợp UC04/07/08 đạt. Phiếu nháp giữ nguyên tồn, xác nhận nhập/bán ghi tồn một lần,
  và hủy đơn hoàn tồn một lần kể cả khi gửi yêu cầu đồng thời.
- Playwright đạt **15/15** ca, gồm **3/3** ca UC02–03 qua MySQL lab. Dùng Edge và cổng
  `3117`/`5187` trong cấu hình tạm để giữ bản demo đang chạy.
- Cả ba chế độ Indexing đạt trên 10.000 linh kiện. Cả MySQL và MongoDB trả 1 kết quả SKU và
  11 kết quả hãng + giá. Bảng timing ở trên dùng số liệu đã lưu ngày 14/11.
- Backup/restore đạt trên cả MySQL và MongoDB lab. Cả sáu giá trị đối chiếu khớp nguồn.
  MongoDB khôi phục 5 document, 0 lỗi.

Khánh đã ghi nhận test HTTP UC02–03 bản đầu và luồng tra cứu với migration `002` đạt trên nhánh C.
Chờ Khánh review hợp đồng mới của UC02 và đề xuất UC03. Chạy lại demo trên bản Đạt hợp nhất
cho buổi tổng duyệt nhóm 25–27/11.
[Bàn giao Khánh](https://github.com/fluoxetines73/partstock_dbms/blob/ded91a9/docs/handoffs/c-sprint1-2.md#L34-L41)
[Kế hoạch sprint 3](../plan.md#6-hoàn-thiện-và-nộp-bài) · [Đề xuất Q01](../../agent/decisions.md#q01-nha-cung-cap)

### Kiểm thử sau khi nối thao tác ngừng kinh doanh

- Backend **11/11**, frontend build thành công và Playwright **16/16** trên Edge.
  Ca UC02 mới kiểm tra đóng hộp thoại không đổi trạng thái, xác nhận ngừng kinh doanh
  và đọc lại linh kiện sau khi tải trang.
- HTTP UC02–03 và UC04/07/08 đạt trên MySQL lab. Chỉ Quản lý đổi được trạng thái và gửi lặp
  không đổi tồn hoặc sổ biến động. Các nháp có linh kiện đã ngừng bị chặn xác nhận. Phiếu nhập
  và đơn bán đã xác nhận vẫn đọc được. Hủy đơn bán hoàn tồn đúng một lần.
