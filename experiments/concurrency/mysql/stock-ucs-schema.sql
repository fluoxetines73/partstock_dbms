-- Only applied in the newly created partstock_e_* lab database, after the project's 003 seed.
ALTER TABLE inventory
  ADD COLUMN count_revision INT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE e_counts (
  code VARCHAR(30) PRIMARY KEY,
  status ENUM('DRAFT','CONFIRMED') NOT NULL,
  reason VARCHAR(500) NOT NULL CHECK (CHAR_LENGTH(TRIM(reason)) > 0)
) ENGINE=InnoDB;

CREATE TABLE e_count_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  count_code VARCHAR(30) NOT NULL UNIQUE,
  product_id BIGINT UNSIGNED NOT NULL,
  system_qty INT NOT NULL CHECK (system_qty >= 0),
  counted_qty INT NOT NULL CHECK (counted_qty >= 0),
  captured_revision INT UNSIGNED NOT NULL,
  UNIQUE (id, product_id),
  FOREIGN KEY (count_code) REFERENCES e_counts(code),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

ALTER TABLE stock_movements ADD CONSTRAINT fk_e_lab_count_product
  FOREIGN KEY (stock_count_line_id,product_id) REFERENCES e_count_lines(id,product_id);
