# Kịch bản demo miền B — UC02–03, Indexing và Backup/restore

Chạy từ PowerShell ở gốc repo. Bật Docker Desktop, dùng `.env.docker` local và
xác nhận `mysql-lab`, `mongo-lab` đang healthy. MongoDB cần `rs0 PRIMARY`.
Chạy từng lệnh và xem exit code trước khi chuyển bước. [setup-local-docker.md](../../setup-local-docker.md)

```powershell
$compose = @('compose','--env-file','.env.docker','-f','compose.local.yaml')
docker @compose ps mysql-lab mongo-lab
```

## 1. UC02–03 qua HTTP trên MySQL lab

Script tự tạo schema lab riêng, chạy migration `001 → 002`, nạp seed `001 → 002`,
rồi gọi API thật bằng token thử. Script dọn schema sau lượt chạy.

```powershell
npm.cmd --prefix backend test
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
```

| Minh chứng | Output và dữ liệu cần trình bày |
|---|---|
| Đọc seed | `GET` trả 5 sản phẩm và 2 nhà cung cấp |
| `insert` | `POST /api/products` tạo `RAM-TEST-01` giá 450.000 VND và trả `201`. `POST /api/suppliers` tạo nhà cung cấp mẫu và trả `201` |
| `update` | `PATCH /api/products/:id` đổi giá thành 470.000 VND. `PATCH /api/suppliers/:id` cập nhật số điện thoại. `GET` cuối đọc lại các giá trị đã lưu |
| Ràng buộc | Giá âm và FK không tồn tại trả `400`. SKU trùng trả `409`. `GET` cuối xác nhận dữ liệu chỉ đổi theo các request thành công |

Đây là minh chứng API → MySQL để Khánh đối chiếu rubric. Demo list/form từ UI và
nghiệp vụ khởi tạo tồn chờ tích hợp. [uc02-03.cjs](../../backend/tests-db/uc02-03.cjs) · [backend/README.md](../../backend/README.md)

## 2. Indexing trên MySQL và MongoDB

```powershell
node experiments/indexing/run.cjs
node experiments/indexing/run.cjs --index-size
node experiments/indexing/run.cjs --update-cost
```

1. **Query plan:** Với 10.000 sản phẩm, trình bày SKU lookup trả 1 kết quả và hãng + giá trả
   11 kết quả ở cả hai pha. Mở một mẫu before/after để chỉ ra table/collection scan
   chuyển thành index lookup hoặc range scan. So median của 5 mẫu trong từng hệ.
2. **Index size:** Chỉ ra index mặc định, `idx_sku` và `idx_brand_price`. Giải thích
   MySQL tính theo pages InnoDB và MongoDB lấy bytes từ index stats.
3. **Update cost:** Mỗi batch cập nhật 1.000 giá. Mở `modified`, `reset` và
   `baselineMatches` để kiểm chứng dữ liệu về baseline. Trình bày vì sao update giá
   thay đổi key của index ghép.

Timing thay đổi theo môi trường chạy. Khi demo, dùng số liệu đã lưu để đối chiếu
phương pháp và dùng query plan, số bản ghi trả về và kết quả reset để xác minh lượt mới.
[3-3-indexing.md](3-3-indexing.md) · [experiments/indexing/README.md](../../experiments/indexing/README.md)

## 3. Backup/restore trên lab

```powershell
Get-Content -Raw ./experiments/backup-restore/mysql.sh | docker @compose exec -T mysql-lab bash -o pipefail -c "tr -d '\r' | bash"
Get-Content -Raw ./experiments/backup-restore/mongodb.sh | docker @compose exec -T mongo-lab bash -o pipefail -c "tr -d '\r' | bash"
```

1. Chỉ ra dòng `Source=` và `Target=` để xác nhận script dùng hai đích riêng.
2. Đọc baseline và output sau restore. Cả hai hệ phải khớp 2 sản phẩm, 1 đơn xác
   nhận, 2 dòng đơn, 2 bản ghi tồn, tổng tồn 11 và tổng tiền 1.830.000 VND.
3. MySQL và MongoDB đều phải in `PASS`. MongoDB báo 5 documents thành công, 0 lỗi
   vì hai dòng đơn nằm trong document đơn bán. Dòng `Files=` chỉ nơi giữ log
   và số liệu trước/sau cho người kiểm chứng.

Hải chạy hai script độc lập với đích lab mới và ghi PASS/FAIL cùng số liệu đối
chiếu cho từng hệ. [3-7-backup-restore.md](3-7-backup-restore.md) · [experiments/backup-restore/README.md](../../experiments/backup-restore/README.md)
