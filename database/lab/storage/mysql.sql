-- Lab fixture only: not the application schema.
CREATE TABLE storage_products (
 id INT UNSIGNED PRIMARY KEY, sku VARCHAR(32) NOT NULL UNIQUE,
 name VARCHAR(80) NOT NULL, selling_price DECIMAL(15,0) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE storage_specifications (
 product_id INT UNSIGNED PRIMARY KEY, description VARCHAR(1024) NOT NULL,
 FOREIGN KEY(product_id) REFERENCES storage_products(id) ON DELETE CASCADE
) ENGINE=InnoDB;
