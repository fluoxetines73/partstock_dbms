-- D / UC04, UC07, UC08. Apply once after 002_products_suppliers.sql on a schema without these tables.
-- Design draft: docs/architecture/f03-quy-tac-chung-tu-kho.md and f04-erd-mien-d.md.
-- Tables: inventory, purchase_receipts(+lines), sales_orders(+lines), stock_movements.
-- Quantities are INT, money is DECIMAL(15,0) VND, times are DATETIME(3).
-- confirmed_at, cancelled_at and occurred_at are written by the backend in Vietnam time (+07:00).

CREATE TABLE inventory (
    product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT chk_inventory_quantity CHECK (quantity_on_hand >= 0),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

INSERT INTO inventory (product_id, quantity_on_hand) SELECT id, 0 FROM products;

CREATE TABLE purchase_receipts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    status ENUM('DRAFT', 'CONFIRMED') NOT NULL DEFAULT 'DRAFT',
    note VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    confirmed_at DATETIME(3) NULL,
    CONSTRAINT uq_purchase_receipts_code UNIQUE (code),
    CONSTRAINT chk_purchase_receipts_state CHECK (
        (status = 'DRAFT' AND confirmed_at IS NULL) OR (status = 'CONFIRMED' AND confirmed_at IS NOT NULL)
    ),
    CONSTRAINT fk_purchase_receipts_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    INDEX idx_purchase_receipts_status_confirmed (status, confirmed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE purchase_receipt_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    receipt_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(15,0) NOT NULL,
    CONSTRAINT uq_receipt_lines_product UNIQUE (receipt_id, product_id),
    CONSTRAINT uq_receipt_lines_id_product UNIQUE (id, product_id),
    CONSTRAINT chk_receipt_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_receipt_lines_cost CHECK (unit_cost >= 0),
    CONSTRAINT fk_receipt_lines_receipt FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    CONSTRAINT fk_receipt_lines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE sales_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL,
    status ENUM('DRAFT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    customer_name VARCHAR(150) NULL,
    note VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    confirmed_at DATETIME(3) NULL,
    cancelled_at DATETIME(3) NULL,
    cancel_reason VARCHAR(500) NULL,
    CONSTRAINT uq_sales_orders_code UNIQUE (code),
    CONSTRAINT chk_sales_orders_state CHECK (
        (status = 'DRAFT' AND confirmed_at IS NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
        OR (status = 'CONFIRMED' AND confirmed_at IS NOT NULL AND cancelled_at IS NULL AND cancel_reason IS NULL)
        OR (status = 'CANCELLED' AND confirmed_at IS NOT NULL AND cancelled_at IS NOT NULL
            AND cancel_reason IS NOT NULL AND cancelled_at >= confirmed_at)
    ),
    INDEX idx_sales_orders_status_confirmed (status, confirmed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE sales_order_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(15,0) NOT NULL,
    CONSTRAINT uq_order_lines_product UNIQUE (order_id, product_id),
    CONSTRAINT uq_order_lines_id_product UNIQUE (id, product_id),
    CONSTRAINT chk_order_lines_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_lines_price CHECK (unit_price >= 0),
    CONSTRAINT fk_order_lines_order FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_lines_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- Append-only ledger shared with E (UC09, UC12). stock_count_line_id has no FK yet: E owns the count tables.
CREATE TABLE stock_movements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('IMPORT', 'SALE', 'SALE_CANCEL', 'ADJUSTMENT') NOT NULL,
    quantity_delta INT NOT NULL,
    quantity_after INT NOT NULL,
    purchase_receipt_line_id BIGINT UNSIGNED NULL,
    sales_order_line_id BIGINT UNSIGNED NULL,
    stock_count_line_id BIGINT UNSIGNED NULL,
    reason VARCHAR(500) NULL,
    occurred_at DATETIME(3) NOT NULL,
    CONSTRAINT chk_movements_after CHECK (quantity_after >= 0),
    CONSTRAINT chk_movements_shape CHECK (
        (movement_type = 'IMPORT' AND quantity_delta > 0 AND purchase_receipt_line_id IS NOT NULL
            AND sales_order_line_id IS NULL AND stock_count_line_id IS NULL)
        OR (movement_type = 'SALE' AND quantity_delta < 0 AND sales_order_line_id IS NOT NULL
            AND purchase_receipt_line_id IS NULL AND stock_count_line_id IS NULL)
        OR (movement_type = 'SALE_CANCEL' AND quantity_delta > 0 AND sales_order_line_id IS NOT NULL
            AND purchase_receipt_line_id IS NULL AND stock_count_line_id IS NULL)
        OR (movement_type = 'ADJUSTMENT' AND quantity_delta <> 0 AND stock_count_line_id IS NOT NULL
            AND reason IS NOT NULL AND purchase_receipt_line_id IS NULL AND sales_order_line_id IS NULL)
    ),
    CONSTRAINT uq_movements_receipt_line UNIQUE (movement_type, purchase_receipt_line_id),
    CONSTRAINT uq_movements_order_line UNIQUE (movement_type, sales_order_line_id),
    CONSTRAINT uq_movements_count_line UNIQUE (movement_type, stock_count_line_id),
    CONSTRAINT fk_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_movements_receipt_line FOREIGN KEY (purchase_receipt_line_id, product_id)
        REFERENCES purchase_receipt_lines(id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movements_order_line FOREIGN KEY (sales_order_line_id, product_id)
        REFERENCES sales_order_lines(id, product_id) ON DELETE RESTRICT,
    INDEX idx_movements_product_time (product_id, occurred_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
