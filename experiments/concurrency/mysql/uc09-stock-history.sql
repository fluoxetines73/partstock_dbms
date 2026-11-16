-- @sku NULL lấy tất cả. Khoảng ngày là [@from_time, @to_time).
SELECT movement_id, sku, kind, order_id, before_qty, after_qty,
       after_qty - before_qty AS delta, reason, recorded_at
FROM role_e_movements
WHERE run_id = @run_id
  AND (@sku IS NULL OR sku = @sku)
  AND (@from_time IS NULL OR recorded_at >= @from_time)
  AND (@to_time IS NULL OR recorded_at < @to_time)
ORDER BY recorded_at DESC, movement_id DESC;
