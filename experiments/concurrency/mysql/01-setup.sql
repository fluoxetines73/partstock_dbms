-- Schema thử nghiệm riêng cho E. @run_id do run-role-e.sh cung cấp.
CREATE TABLE IF NOT EXISTS role_e_runs (
  run_id VARCHAR(32) PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_e_stock (
  run_id VARCHAR(32) NOT NULL,
  sku VARCHAR(24) NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 0),
  low_threshold INT NOT NULL CHECK (low_threshold >= 0),
  stock_version INT NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, sku),
  FOREIGN KEY (run_id) REFERENCES role_e_runs(run_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_e_orders (
  run_id VARCHAR(32) NOT NULL,
  order_id CHAR(1) NOT NULL,
  sku VARCHAR(24) NOT NULL,
  status ENUM('DRAFT', 'CONFIRMED') NOT NULL DEFAULT 'DRAFT',
  PRIMARY KEY (run_id, order_id),
  FOREIGN KEY (run_id, sku) REFERENCES role_e_stock(run_id, sku)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_e_movements (
  movement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  run_id VARCHAR(32) NOT NULL,
  sku VARCHAR(24) NOT NULL,
  kind ENUM('SALE', 'ADJUSTMENT') NOT NULL,
  order_id CHAR(1),
  before_qty INT NOT NULL,
  after_qty INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  recorded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE (run_id, order_id),
  INDEX (run_id, sku, movement_id),
  FOREIGN KEY (run_id, sku) REFERENCES role_e_stock(run_id, sku),
  FOREIGN KEY (run_id, order_id) REFERENCES role_e_orders(run_id, order_id)
) ENGINE=InnoDB;

START TRANSACTION;
INSERT INTO role_e_runs VALUES (@run_id);
INSERT INTO role_e_stock (run_id, sku, quantity, low_threshold) VALUES
  (@run_id, 'GPU-LAST', 1, 2),
  (@run_id, 'RAM-AT', 2, 2),
  (@run_id, 'SSD-ABOVE', 5, 2);
INSERT INTO role_e_orders (run_id, order_id, sku) VALUES
  (@run_id, 'A', 'GPU-LAST'), (@run_id, 'B', 'GPU-LAST');
COMMIT;

SELECT @run_id AS run_id, 'READY' AS result;
