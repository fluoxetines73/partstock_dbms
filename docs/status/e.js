partstockStatus.E = {
  stage: "working",
  updated: "2026-11-26",
  summary: "Lab Concurrency đạt 32/32 ca trên mỗi hệ và restore hai hệ đã kiểm chứng, đã vào main qua PR #11. UC10 đã vào main qua PR #14 với migration 004, API và màn hình cảnh báo tồn kho. Ca bán/hủy đã xác nhận cảnh báo xuất hiện ở tồn 8 và biến mất khi tồn về ngưỡng 9.",
  next: "Rà migration 004 cùng Tuấn và tiếp tục triển khai UC09, UC12 trong ứng dụng. Chạy kiểm tra ZIP độc lập ngày 28/11.",
  links: [
    { label: "Báo cáo Concurrency", path: "../../experiments/concurrency/Bao_cao_concurrency.md" },
    { label: "Lab Concurrency", path: "../../experiments/concurrency/README.md" },
  ],
};
