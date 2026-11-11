# Dữ liệu dùng chung

B phụ trách; mỗi owner góp tình huống, E kiểm chứng. Chưa có generator/seed hoặc lệnh chạy.
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
