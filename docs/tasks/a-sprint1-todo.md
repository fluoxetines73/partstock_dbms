# Todo Sprint 1 — A

Nhánh: `docs/a-sprint1-foundation`. Theo [plan chung](../plan.md), bàn giao nền ngày 12/11.

- [x] Tạo nhánh riêng.
- [x] Viết [thiết kế UC01 bản nháp](../architecture/uc01-catalog-brand-design.md).
- [x] Vẽ [ERD miền A bản nháp](../architecture/erd-mien-a.md).
- [ ] Chốt cấu trúc danh mục/thương hiệu với B và API với C.
- [x] Chuẩn bị [đề xuất khung backend](../architecture/backend-foundation.md).
- [x] Người dùng tự cài Express, mysql2 và TypeScript theo hướng dẫn.
- [x] Viết khung backend, lệnh build/start/test; 6 test đạt.
- [x] Người dùng đã chạy DB; kết nối app thành công khi áp dụng migration.
- [x] Viết migration/seed miền A; áp dụng hai bảng app, seed chỉ chạy trong test lab.
- [x] Viết API CRUD; 11 test đạt, integration MySQL lab đạt.
- [ ] B hợp nhất migration và FK sản phẩm; C ghép UI/API.
- [ ] Nhận thiết kế B/D/E để ghép ERD chung.
- [x] Kiểm tra thực tế và viết hướng dẫn chạy trong backend/README.md.
- [ ] B review phần A; xử lý phản hồi và tích hợp qua PR.

Đã có backend và API/schema UC01; còn UI, phân quyền chung, tích hợp sản phẩm và review B. Hoàn tất nền khi chạy được theo
hướng dẫn, có kết quả kiểm tra và review; phần thiếu đầu vào phải ghi rõ.
Sau đó tiếp tục UC01 đầy đủ và lab Storage để bàn giao cùng Sprint 2 ngày 13–15/11.

Bàn giao 11/11: build và 11/11 test được chạy lại trước commit/push, đạt. Kiểm tra MySQL lab
đã đạt trong lượt triển khai; chưa chạy lab Storage hoặc nghiệm thu giao diện/phân quyền.
