# Dàn ý báo cáo kỹ thuật

Đề tài: **So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**.

## 1. Giới thiệu
Bối cảnh, mục tiêu hai phần, phạm vi một cửa hàng/một kho, tiêu chí đánh giá và giới hạn.

## 2. Ứng dụng và thiết kế
12 use case và sơ đồ; ERD/model, kiến trúc, quy tắc tồn/chứng từ, API và lựa chọn công nghệ.
Minh chứng ứng dụng MySQL, 8 dạng thao tác, hướng dẫn chạy/demo và kiểm thử.
Kịch bản UC02–03 qua HTTP và demo hai lab của B trong [demo-mien-b.md](demo-mien-b.md).

## 3. Thực nghiệm MySQL và MongoDB
### 3.1. Phương pháp chung
Dữ liệu logic, mô hình riêng, phiên bản/cấu hình, quy mô/index/cache, số lần chạy, reset và giới hạn so sánh.
### 3.2. Storage & management — A
Tổ chức lưu trữ và bằng chứng cơ chế.
### 3.3. Indexing — B
Bản đầu gồm phương pháp, query plan, số liệu đọc trước/sau, index size, update cost và lệnh demo.
[3-3-indexing.md](3-3-indexing.md)
### 3.4. Query processing — C
Kế hoạch thực thi, diễn giải và liên hệ số đo.
### 3.5. Transaction — D
Commit/rollback, lỗi giữa chừng, bất biến.
### 3.6. Concurrency control — E
Nhiều phiên tranh chấp tồn cuối, lịch xen kẽ và kết quả.
### 3.7. Backup/restore — B, E kiểm chứng
Bản đầu gồm fixture, logical backup, restore vào đích lab sạch, số liệu đối chiếu
và giới hạn của phép đo. Chờ E kiểm chứng độc lập. [3-7-backup-restore.md](3-7-backup-restore.md)

## 4. Teamwork và quản lý
Phân công/đóng góp A–E, sprint, review, biên bản, phụ thuộc và xử lý rủi ro; liên kết bằng chứng.

## 5. Kết luận và tự đánh giá
Kết luận có điều kiện theo nghiệp vụ, đối chiếu rubric, giới hạn và việc chưa đạt; không tuyên bố hệ thắng chung.

## 6. Tài liệu tham khảo và phụ lục
Nguồn chính thức theo phiên bản, trích dẫn; script, dữ liệu tái tạo, kết quả nhỏ và kịch bản demo.
Bản nộp PDF, kèm mã nguồn/script/hướng dẫn trong ZIP; slide không bắt buộc.
