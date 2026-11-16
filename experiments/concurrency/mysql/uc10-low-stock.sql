SELECT sku, quantity, low_threshold, low_threshold - quantity AS shortage
FROM role_e_stock
WHERE run_id = @run_id AND quantity < low_threshold
ORDER BY shortage DESC, sku;
