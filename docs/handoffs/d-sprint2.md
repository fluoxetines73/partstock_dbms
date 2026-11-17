# Bàn giao Sprint 1–2 · D — Nam

Ngày 17/11/2026. Reviewer theo plan: Hải (E). Nhánh `feat/uc04-07-08-transactions` từ main `461fa5b`
(đã gồm các PR của Khánh). Chưa tạo PR, chưa commit. **Sẵn sàng review; chưa nghiệm thu.** Mọi kết quả dưới đây do agent
Claude Code chạy theo yêu cầu của Nam trên máy Windows 11 của Nam (Docker Desktop 29.4.0, MySQL 8.4.13, MongoDB 8.0.34 rs0),
chưa có người khác tái tạo.

## Mục tiêu và tiêu chí

UC04 phiếu nhập, UC07 đơn bán, UC08 hủy đơn, và lab Transaction trên cả hai DBMS. Đạt khi: nháp không đổi tồn;
xác nhận/hủy giữ chứng từ–tồn–biến động nhất quán; không bán âm; không hoàn kho lặp; giá lưu tại lúc bán; có bằng chứng lỗi giữa chừng.

## File thay đổi

| Nhóm | File | Ghi chú |
|---|---|---|
| Schema | [migration 003](../../database/mysql/migrations/003_inventory_documents.sql), [seed 003](../../database/seed/003_inventory_documents.sql), [runner](../../backend/scripts/setup-catalog.cjs) | Sáu bảng theo F04, backfill tồn 0, runner nhận 003 |
| API | [documents.ts](../../backend/src/documents.ts), [purchases.ts](../../backend/src/purchases.ts), [sales.ts](../../backend/src/sales.ts); nối ở `app.ts`, `db.ts`, `server.ts` | Route ở [API contract](../architecture/api-contract.md) |
| UC02 | [products.ts](../../backend/src/products.ts) | `POST /api/products` tạo dòng tồn 0 cùng transaction (F03 Q6) |
| UI | [DocumentsPage.jsx](../../frontend/src/DocumentsPage.jsx), [documents-api.js](../../frontend/src/documents-api.js), `main.jsx`, `styles.css` | Hai mục "Nhập kho", "Bán hàng" |
| Test | [uc04-07-08.cjs](../../backend/tests-db/uc04-07-08.cjs), [documents.spec.js](../../frontend/tests/documents.spec.js) | HTTP→MySQL và trình duyệt |
| Lab | [experiments/transactions/](../../experiments/transactions/README.md), [báo cáo 3.5](../report/3-5-transaction.md) | 10 ca, hai hệ |
| Test của người khác | `queries.cjs` (C), `uc02-03.cjs` (B), `ui-server.cjs` (A), `queries.spec.js` (C), `playwright.config.js` | Bỏ fixture, chạy trên bảng thật; xem [sổ quyết định](../../agent/decisions.md) |
| Tài liệu | requirements, api-contract, các README, F03/F04 (ghi chú cập nhật), outline, draft-integrated, `docs/status/d.js` | |

## Cách kiểm tra (từ gốc repo, cần `.env.docker`, MySQL lab, MongoDB lab rs0)

```powershell
npm ci --prefix backend; npm ci --prefix frontend
npm test --prefix backend
node --env-file=.env.docker backend/tests-db/catalog.cjs
node --env-file=.env.docker backend/tests-db/uc02-03.cjs
node --env-file=.env.docker backend/tests-db/queries.cjs
npm run test:db:documents --prefix backend
npm run build --prefix frontend
npm test --prefix frontend          # cần Chromium hoặc PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
node --env-file=.env.docker experiments/transactions/run.cjs
```

## Kết quả thật (17/11/2026)

Xem số liệu và ghi chú trong từng README: [backend](../../backend/README.md), [frontend](../../frontend/README.md),
[lab](../../experiments/transactions/README.md). Tóm tắt: backend 11/11 test; bốn test DB (catalog, UC02–03, queries, UC04/07/08) đạt;
12/12 test trình duyệt; lab 38/38 kiểm tra trên hai hệ, kể cả ca đối chứng không dùng transaction làm hỏng I2/I4.

## Chưa làm / giới hạn

- Chưa áp migration 003 vào MySQL app; chưa PR/review; chưa chạy trên máy thứ hai hoặc macOS.
- Sửa nháp thay toàn bộ dòng; UI chọn sản phẩm lấy tối đa 100 sản phẩm; không hủy phiếu nhập; không đăng nhập thật (hai token local).
- Lab dùng một node MongoDB; ca tranh chấp đồng thời chỉ kiểm cho MySQL (ứng dụng), phần so hai hệ thuộc E.
- Chưa có UC09/10/12; chưa có bảng kiểm kê và chỗ lưu ngưỡng UC10.

## Cần nhóm chốt / người tiếp nhận

- **Hải:** kiểm kê (delta của F03 hay `stock_version` của lab E), ngưỡng UC10, migration 004; review gói D; chạy lại lab trên máy khác.
  Hải có thể dùng bảng thật của 003 và seed 003 để chạy lại các ca "Ca đã chuẩn bị để chạy trên bản tích hợp" trong
  [README E](../../experiments/concurrency/README-Role-E-Progress.md): nhập → bán → hủy, lỗi giữa chừng (ca 2–5 của lab D), xác nhận/hủy lặp.
- **Đạt/Khánh:** xem lại thay đổi test ở bảng trên; Khánh xác nhận doanh thu phương án A khớp đơn thật.
- **Nhóm:** Q1–Q8 của F03 (đang dùng đề xuất làm mặc định), hạn hủy đơn, cách ghi giờ VN.
