SELECT order_id, status
FROM role_e_orders WHERE run_id = @run_id ORDER BY order_id;

SELECT sku, quantity, stock_version
FROM role_e_stock WHERE run_id = @run_id AND sku = 'GPU-LAST';

SELECT order_id, sku, before_qty, after_qty
FROM role_e_movements WHERE run_id = @run_id AND kind = 'SALE';

SELECT IF(
  (SELECT COUNT(*) FROM role_e_orders WHERE run_id = @run_id) = 2
  AND (SELECT COUNT(*) FROM role_e_orders WHERE run_id = @run_id AND status = 'CONFIRMED') = 1
  AND (SELECT COUNT(*) FROM role_e_movements WHERE run_id = @run_id) = 1
  AND EXISTS (
    SELECT 1
    FROM role_e_movements m
    JOIN role_e_orders o ON o.run_id = m.run_id AND o.order_id = m.order_id AND o.sku = m.sku
    JOIN role_e_stock s ON s.run_id = m.run_id AND s.sku = m.sku
    WHERE m.run_id = @run_id AND m.kind = 'SALE' AND m.sku = 'GPU-LAST'
      AND m.before_qty = 1 AND m.after_qty = 0
      AND o.status = 'CONFIRMED' AND s.quantity = 0 AND s.stock_version = 1
  ), 'PASS', 'FAIL') AS verification;
