# Dàn ý báo cáo kỹ thuật PartStock

**So sánh MySQL và MongoDB trong bài toán quản lý bán hàng và tồn kho linh kiện máy tính**

[Bản tổng hợp ngày 24/11](draft-integrated.md) · [Kịch bản demo tích hợp](demo-tich-hop.md)

## 1. Giới thiệu

Bối cảnh một cửa hàng, một kho và hai vai trò. Trình bày mục tiêu ứng dụng MySQL, mục tiêu thực nghiệm hai hệ và tiêu chí đánh giá. [Yêu cầu và rubric](../requirements.md)

## 2. Ứng dụng và thiết kế

Đặc tả 12 use case, kiến trúc React/Vite → Express/TypeScript → MySQL và ERD Chen từ migration 001–003. Giải thích các bất biến chứng từ, tồn và biến động qua ca nhập, bán, hủy. Đối chiếu tám dạng thao tác theo ca kiểm thử. UC09, UC10 và UC12 có minh chứng lab E, phần UI/API ứng dụng còn mở. [ERD](../architecture/erd-integrated-review.md) · [Use case](../architecture/use-cases.md) · [Bảng thao tác](draft-integrated.md#22-bằng-chứng-tám-dạng-thao-tác)

## 3. Thực nghiệm MySQL và MongoDB

| Mục | Nội dung |
|---|---|
| **3.1 Phương pháp chung** | Dữ liệu tương đương về logic, mô hình riêng từng hệ, phiên bản, topology, seed, quy mô, index, cache, số mẫu và cách kiểm chứng. |
| **3.2 Storage & management · A** | Năm pha, từ nạp đến mở rộng và xóa dữ liệu. Phân tích dung lượng cấp phát và kích thước dữ liệu logic. [Chương 3.2](3-2-storage.md) |
| **3.3 Indexing · B** | Đọc trước/sau khi thêm index, kế hoạch và số bản ghi đã xét, dung lượng index và chi phí cập nhật. [Chương 3.3](3-3-indexing.md) |
| **3.4 Query processing · C** | Lọc có/bỏ index, chưa từng bán và tổng hợp doanh thu. Giải thích đường truy cập, join/lookup và số bản ghi đã xử lý. [Chương 3.4](3-4-query-processing.md) |
| **3.5 Transaction · D** | Commit, rollback, lỗi giữa chừng, bất biến và đối chứng tự commit qua 10 tình huống trên hai hệ. [Chương 3.5](3-5-transaction.md) |
| **3.6 Concurrency control · E** | Hai đơn tranh tồn cuối, snapshot khi đọc lịch sử, cảnh báo theo ngưỡng và các phiên cùng xác nhận kiểm kê. Minh chứng 32/32 trên từng hệ. [Chương 3.6](../../experiments/concurrency/Bao_cao_concurrency.md) |
| **3.7 Backup/restore · B, E kiểm chứng** | Logical backup và đối chiếu sau restore vào đích lab sạch. Nêu giới hạn nguồn đứng yên và phạm vi kiểm chứng Docker Compose. [Chương 3.7](3-7-backup-restore.md) |

## 4. Teamwork và quản lý

Đóng góp A–E, lịch sử PR, kết quả review và bước còn mở. Dẫn review thực tế của Tuấn và Đạt. [Phân công](../ownership.md) · [Tiến độ](../plan.md) · [Review UC01/Storage](../reviews/b-uc01-storage-2026-11-23.md) · [Review gói C](https://github.com/fluoxetines73/partstock_dbms/blob/c9052a9e72e0b3a5679199475bd72a0d15211800/docs/reviews/a-review-c-query-2026-11-24.md)

## 5. Kết luận và tự đánh giá

Kết luận theo mô hình và workload đã chạy. Đối chiếu rubric với bằng chứng, giới hạn và các quyết định cần chốt trước nghiệm thu. [Sổ quyết định](../../agent/decisions.md)

## 6. Tài liệu tham khảo và phụ lục

Dẫn nguồn kỹ thuật theo phiên bản trong mỗi bài. Mỗi phụ lục ghép script, seed, cách chạy và kết quả tương ứng. ZIP nộp gồm báo cáo PDF, mã nguồn, hướng dẫn, script và minh chứng. [Kế hoạch đóng gói](../plan.md#6-hoàn-thiện-và-nộp-bài)
