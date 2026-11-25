partstockStatus.E = {
  stage: "working",
  updated: "2026-11-25",
  summary: "Lab Concurrency đạt 32/32 ca trên mỗi hệ và restore hai hệ đã kiểm chứng, đã vào main qua PR #11. UC09, UC10, UC12 chưa có migration, API hay UI trong app; app hiện có 9/12 UC.",
  next: "Làm UC09 (đọc stock_movements) và UC10 (migration 004 low_threshold theo bàn giao UC10) trước 27/11, UC12 nếu kịp. Chạy kiểm tra ZIP độc lập ngày 28/11.",
  links: [
    { label: "Báo cáo Concurrency", path: "../../experiments/concurrency/Bao_cao_concurrency.md" },
    { label: "Lab Concurrency", path: "../../experiments/concurrency/README.md" },
  ],
};
