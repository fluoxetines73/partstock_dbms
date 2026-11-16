CREATE TEMPORARY TABLE qp_products (
  id INT PRIMARY KEY, category_id INT NOT NULL, brand_id INT NOT NULL,
  price INT NOT NULL, stock INT NOT NULL,
  INDEX qp_filter (category_id, brand_id, price)
);
CREATE TEMPORARY TABLE qp_orders (
  id INT PRIMARY KEY, status VARCHAR(12) NOT NULL, confirmed_at DATE NOT NULL,
  INDEX qp_period (status, confirmed_at)
);
CREATE TEMPORARY TABLE qp_lines (
  order_id INT PRIMARY KEY, product_id INT NOT NULL, quantity INT NOT NULL, unit_price INT NOT NULL,
  INDEX qp_product (product_id)
);
