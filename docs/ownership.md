# Phân công A–E

Phân công kế hoạch; năng lực tương đương, chưa ghi nhận thành viên đã nhận/xong việc.

| Người     | Chủ đề trên cả MySQL và MongoDB | Ứng dụng xuyên suốt UI–API–DB | Trách nhiệm chung                                                          |
| --------- | ------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| A — Đạt   | Storage & management            | UC01                          | Chốt phạm vi/thiết kế, hợp nhất ERD, khung backend, backlog/sprint, tích hợp, báo cáo tổng thể, nộp ZIP |
| B — Tuấn  | Indexing                        | UC02–03                       | Môi trường; hợp nhất migration/model lab; seed, cơ chế chạy lab, backup/restore cả hai hệ |
| C — Khánh | Query processing                | UC05–06–11                    | Khung UI/mock, hợp nhất tài liệu API, đối chiếu 8 dạng thao tác |
| D — Nam   | Transaction                     | UC04–07–08                    | Giao dịch chứng từ/tồn và lỗi giữa chừng                                   |
| E — Hải   | Concurrency control             | UC09–10–12                    | Ma trận kiểm thử/tích hợp/đồng thời; xác minh máy thứ hai và restore; kiểm tra ZIP độc lập với A |

Cập nhật cách tổ chức ngày 11/11 theo yêu cầu người dùng: năm gói cá nhân xuyên suốt,
giữ nguyên chủ đề DBMS, UC và trách nhiệm chung trong bảng. Mỗi owner tự làm thiết kế,
migration/API/UI, kiểm chứng và báo cáo miền mình; đầu mối hợp nhất không làm thay tất cả.
Phụ thuộc, reviewer và hạn xem [plan](plan.md); thay đổi được ghi trong
[sổ quyết định](../agent/decisions.md). Chưa phải xác nhận nhận việc của toàn nhóm.

A khởi động repo và quy ước Git; B triển khai môi trường, A kiểm tra cả nhóm chạy được.
A hỗ trợ bootstrap không đồng nghĩa nhận hết việc B. A chủ trì quyết định chung, ưu tiên,
khối lượng và kiểm soát merge; B–E đóng góp thiết kế chuyên môn. Code A cũng cần reviewer khác.
Owner không độc quyền file; mỗi task phải chỉ định reviewer khi đưa Ready.
Mỗi người viết báo cáo/demo phần mình và trình bày khi nộp.

Phụ thuộc: cấu trúc/schema/API và quy tắc chung → seed/mock → triển khai độc lập.
Không cần chờ CRUD người trước; nghiệm thu cần module thật trên bản tích hợp.
D–E chốt chung cơ chế kho; B–D kiểm tra cấu hình MongoDB cho transaction.
Seed/mock theo hợp đồng đã thống nhất giúp làm song song; có vấn đề chặn người khác báo ngay A và người nhận.
Xem [plan](plan.md), [requirements](requirements.md), [quyết định](../agent/decisions.md).
