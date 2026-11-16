DELIMITER //

CREATE PROCEDURE IF NOT EXISTS role_e_confirm_order(
  IN p_run VARCHAR(32), IN p_order CHAR(1), IN p_hold INT
)
confirm_order: BEGIN
  DECLARE v_sku VARCHAR(24) DEFAULT NULL;
  DECLARE v_status VARCHAR(12);
  DECLARE v_remaining INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT sku, status INTO v_sku, v_status
  FROM role_e_orders
  WHERE run_id = p_run AND order_id = p_order
  FOR UPDATE;

  IF v_sku IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Run or order does not exist';
  END IF;
  IF v_status = 'CONFIRMED' THEN
    ROLLBACK;
    SELECT p_order AS order_id, 'ALREADY_CONFIRMED' AS result;
    LEAVE confirm_order;
  END IF;

  UPDATE role_e_stock
  SET quantity = quantity - 1, stock_version = stock_version + 1
  WHERE run_id = p_run AND sku = v_sku AND quantity >= 1;
  IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    SELECT p_order AS order_id, 'OUT_OF_STOCK' AS result;
    LEAVE confirm_order;
  END IF;

  -- Chỉ dùng khi demo để phiên thứ hai có thời gian chạm cùng hàng tồn.
  IF p_hold > 0 AND SLEEP(p_hold) <> 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Demo wait interrupted';
  END IF;

  SELECT quantity INTO v_remaining
  FROM role_e_stock WHERE run_id = p_run AND sku = v_sku;

  UPDATE role_e_orders SET status = 'CONFIRMED'
  WHERE run_id = p_run AND order_id = p_order;
  INSERT INTO role_e_movements
    (run_id, sku, kind, order_id, before_qty, after_qty, reason)
  VALUES (p_run, v_sku, 'SALE', p_order, v_remaining + 1, v_remaining, 'Xac nhan ban');
  COMMIT;
  SELECT p_order AS order_id, 'CONFIRMED' AS result;
END//

CREATE PROCEDURE IF NOT EXISTS role_e_adjust_stock(
  IN p_run VARCHAR(32), IN p_sku VARCHAR(24), IN p_count INT,
  IN p_expected_version INT, IN p_reason VARCHAR(255)
)
adjust_stock: BEGIN
  DECLARE v_before INT DEFAULT NULL;
  DECLARE v_version INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_count IS NULL OR p_count < 0 OR p_expected_version IS NULL
     OR p_expected_version < 0 OR p_reason IS NULL OR TRIM(p_reason) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid count, version or reason';
  END IF;

  START TRANSACTION;
  SELECT quantity, stock_version INTO v_before, v_version
  FROM role_e_stock WHERE run_id = p_run AND sku = p_sku FOR UPDATE;
  IF v_before IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Run or SKU does not exist';
  END IF;
  IF v_version <> p_expected_version THEN
    ROLLBACK;
    SELECT 'STALE_COUNT' AS result, v_version AS current_version;
    LEAVE adjust_stock;
  END IF;
  IF v_before = p_count THEN
    COMMIT;
    SELECT 'NO_CHANGE' AS result, v_version AS current_version;
    LEAVE adjust_stock;
  END IF;

  UPDATE role_e_stock
  SET quantity = p_count, stock_version = stock_version + 1
  WHERE run_id = p_run AND sku = p_sku;
  INSERT INTO role_e_movements
    (run_id, sku, kind, before_qty, after_qty, reason)
  VALUES (p_run, p_sku, 'ADJUSTMENT', v_before, p_count, TRIM(p_reason));
  COMMIT;
  SELECT 'ADJUSTED' AS result, p_count - v_before AS delta, v_version + 1 AS current_version;
END//

DELIMITER ;
