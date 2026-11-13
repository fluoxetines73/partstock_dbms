# Dữ liệu dùng chung

B phụ trách; mỗi owner góp tình huống, E kiểm chứng. Chưa có generator chung.
Dự kiến bộ nhỏ để demo đúng nghiệp vụ và bộ có quy mô cấu hình được để đo.
Cùng mã sản phẩm/danh mục/hãng/nhà cung cấp, giá, số lượng, mốc thời gian và tổng nghiệp vụ
trên hai hệ; cho phép cách lưu khác nhau. Ghi seed ngẫu nhiên, quy mô, phân bố và cách tái tạo.
Có tình huống thiếu tồn, tồn thấp, hủy lặp, lỗi giữa chừng, cạnh tranh tồn cuối và kiểm kê có lý do.
Seed phải có thứ tự nạp/reset và đối chiếu số lượng, tổng tồn, tổng tiền; không dùng dữ liệu cá nhân thật.
Dữ liệu lớn đưa vào vùng bị ignore, giữ generator và kết quả tổng hợp nhỏ trong Git.

## Dữ liệu nhỏ UC01

[001_catalogs.sql](001_catalogs.sql): RAM, SSD, Kingston, Samsung; nạp một lần sau migration
trên danh mục rỗng, không reset hoặc ghi đè dữ liệu cũ. Đã chạy trong test lab; chưa nạp vào app.
B hợp nhất với seed chung khi các miền còn lại có schema.

## Dữ liệu mẫu UC02–03

Seed có 5 linh kiện và 2 nhà cung cấp giả lập. Nạp một lần trên schema rỗng của
`mysql-lab` (cổng `3308`), theo thứ tự sau.

1. [database/mysql/migrations/001_catalogs.sql](../mysql/migrations/001_catalogs.sql)
2. [database/mysql/drafts/002_products_suppliers.sql](../mysql/drafts/002_products_suppliers.sql)
3. [database/seed/001_catalogs.sql](001_catalogs.sql)
4. [database/seed/002_products_suppliers.sql](002_products_suppliers.sql)

Chạy trong cùng một kết nối và dừng khi có lỗi. Seed tra ID danh mục và thương hiệu
theo tên từ seed UC01. Phiếu, đơn và tồn kho dùng fixture riêng theo thiết kế D–E.

Kiểm tra sau khi nạp gồm 2 danh mục, 2 hãng, 5 sản phẩm (4 `ACTIVE`, 1 `DISCONTINUED`)
và 2 nhà cung cấp. Lọc Kingston từ 500.000 đến 1.000.000 VND trả về `RAM-KIN-16`
và `SSD-KIN-500`. Xem kết quả kiểm chứng trong [erd-mien-b.md](../../docs/architecture/erd-mien-b.md#kiểm-chứng-thủ-công-của-tuấn).
