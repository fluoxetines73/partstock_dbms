partstockStatus.E = {
  stage: "working",
  updated: "2026-11-26",
  summary: "Lab Concurrency đạt 32/32 ca trên mỗi hệ và restore hai hệ đã kiểm chứng, đã vào main qua PR #11. UC10 đã có migration 004, API và UI trên nhánh tính năng. Ca bán/hủy đã xác nhận cảnh báo xuất hiện ở tồn 8 và biến mất khi tồn về ngưỡng 9. Chờ review để ghép vào main.",
  next: "Review UC10 cùng Tuấn, tiếp tục UC09 và UC12. Chạy kiểm tra ZIP độc lập ngày 28/11.",
  links: [
    { label: "Báo cáo Concurrency", path: "../../experiments/concurrency/Bao_cao_concurrency.md" },
    { label: "Lab Concurrency", path: "../../experiments/concurrency/README.md" },
  ],
};
