-- D / UC04, UC07, UC08. Run once on a clean lab schema after migrations 001-003 and seeds 001-002.
-- Opening stock comes from a confirmed receipt, so stock always equals the sum of ledger movements (F03 I2).
-- Dates are fixed so counts and totals are reproducible. No real personal data.
START TRANSACTION;

INSERT INTO inventory (product_id, quantity_on_hand)
SELECT p.id, 0 FROM products p WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id);

-- 1. Opening receipt (CONFIRMED): 10 + 5 + 8 + 4 = 27 units.
INSERT INTO purchase_receipts (code, supplier_id, status, note, confirmed_at)
VALUES ('PN-20261101-000001', (SELECT id FROM suppliers WHERE name = 'Nha cung cap mau A'),
        'CONFIRMED', 'Nhap ton dau ky (seed)', '2026-11-01 09:30:00.000');
SET @receipt = LAST_INSERT_ID();

INSERT INTO purchase_receipt_lines (receipt_id, product_id, quantity, unit_cost)
SELECT @receipt, p.id, v.quantity, v.unit_cost
FROM products p JOIN (
    SELECT 'RAM-KIN-08' AS sku, 10 AS quantity, 350000 AS unit_cost
    UNION ALL SELECT 'RAM-KIN-16', 5, 650000
    UNION ALL SELECT 'SSD-KIN-500', 8, 800000
    UNION ALL SELECT 'SSD-SAM-1000', 4, 1500000
) v ON v.sku = p.sku;

INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, purchase_receipt_line_id, occurred_at)
SELECT l.product_id, 'IMPORT', l.quantity, l.quantity, l.id, '2026-11-01 09:30:00.000'
FROM purchase_receipt_lines l WHERE l.receipt_id = @receipt ORDER BY l.id;

UPDATE inventory i JOIN purchase_receipt_lines l ON l.product_id = i.product_id AND l.receipt_id = @receipt
SET i.quantity_on_hand = l.quantity;

-- 2. Confirmed order: 2 x RAM-KIN-08 at 420,000 = 840,000 VND. Stock 10 -> 8.
INSERT INTO sales_orders (code, status, customer_name, note, confirmed_at)
VALUES ('DB-20261105-000001', 'CONFIRMED', 'Khach le mau', NULL, '2026-11-05 10:00:00.000');
SET @order_sold = LAST_INSERT_ID();
INSERT INTO sales_order_lines (order_id, product_id, quantity, unit_price)
SELECT @order_sold, id, 2, 420000 FROM products WHERE sku = 'RAM-KIN-08';
INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, sales_order_line_id, occurred_at)
SELECT l.product_id, 'SALE', -l.quantity, 8, l.id, '2026-11-05 10:00:00.000'
FROM sales_order_lines l WHERE l.order_id = @order_sold;
UPDATE inventory SET quantity_on_hand = 8 WHERE product_id = (SELECT id FROM products WHERE sku = 'RAM-KIN-08');

-- 3. Cancelled order: 1 x SSD-KIN-500 sold then returned. Stock 8 -> 7 -> 8.
INSERT INTO sales_orders (code, status, customer_name, note, confirmed_at, cancelled_at, cancel_reason)
VALUES ('DB-20261106-000002', 'CANCELLED', NULL, NULL, '2026-11-06 11:00:00.000', '2026-11-07 15:00:00.000', 'Khach doi y');
SET @order_cancelled = LAST_INSERT_ID();
INSERT INTO sales_order_lines (order_id, product_id, quantity, unit_price)
SELECT @order_cancelled, id, 1, 990000 FROM products WHERE sku = 'SSD-KIN-500';
INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, sales_order_line_id, occurred_at)
SELECT l.product_id, 'SALE', -l.quantity, 7, l.id, '2026-11-06 11:00:00.000'
FROM sales_order_lines l WHERE l.order_id = @order_cancelled;
INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, sales_order_line_id, occurred_at)
SELECT l.product_id, 'SALE_CANCEL', l.quantity, 8, l.id, '2026-11-07 15:00:00.000'
FROM sales_order_lines l WHERE l.order_id = @order_cancelled;

-- 4. Draft order: does not touch stock.
INSERT INTO sales_orders (code, status, customer_name) VALUES ('DB-20261110-000003', 'DRAFT', NULL);
INSERT INTO sales_order_lines (order_id, product_id, quantity, unit_price)
SELECT LAST_INSERT_ID(), id, 1, 790000 FROM products WHERE sku = 'RAM-KIN-16';

COMMIT;

-- Expected afterwards: stock RAM-KIN-08 8, RAM-KIN-16 5, SSD-KIN-500 8, SSD-SAM-1000 4, SSD-SAM-500 0 (total 25);
-- 1 confirmed receipt with 4 lines; 3 sales orders (CONFIRMED, CANCELLED, DRAFT);
-- 7 movements (4 IMPORT, 2 SALE, 1 SALE_CANCEL); confirmed revenue 840,000 VND.
