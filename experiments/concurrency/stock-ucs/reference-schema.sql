-- Portable projection for executing the relational checks without a MySQL or Mongo server.
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT NOT NULL UNIQUE);
CREATE TABLE inventory (product_id INTEGER PRIMARY KEY REFERENCES products, quantity_on_hand INTEGER NOT NULL CHECK(quantity_on_hand>=0),
  low_threshold INTEGER CHECK(low_threshold>=0), count_revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE purchase_receipts (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE);
CREATE TABLE purchase_receipt_lines (id INTEGER PRIMARY KEY, receipt_id INTEGER NOT NULL REFERENCES purchase_receipts,
  product_id INTEGER NOT NULL REFERENCES products, UNIQUE(receipt_id,product_id));
CREATE TABLE sales_orders (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, status TEXT NOT NULL);
CREATE TABLE sales_order_lines (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES sales_orders,
  product_id INTEGER NOT NULL REFERENCES products, quantity INTEGER NOT NULL, UNIQUE(order_id,product_id));
CREATE TABLE e_counts (code TEXT PRIMARY KEY,status TEXT NOT NULL,reason TEXT NOT NULL CHECK(length(trim(reason))>0));
CREATE TABLE e_count_lines (id INTEGER PRIMARY KEY,count_code TEXT NOT NULL UNIQUE REFERENCES e_counts,
  product_id INTEGER NOT NULL REFERENCES products,system_qty INTEGER NOT NULL CHECK(system_qty>=0),
  counted_qty INTEGER NOT NULL CHECK(counted_qty>=0),captured_revision INTEGER NOT NULL, UNIQUE(id,product_id));
CREATE TABLE stock_movements (id INTEGER PRIMARY KEY,product_id INTEGER NOT NULL REFERENCES products,
  movement_type TEXT NOT NULL,quantity_delta INTEGER NOT NULL CHECK(quantity_delta<>0),
  quantity_after INTEGER NOT NULL CHECK(quantity_after>=0),purchase_receipt_line_id INTEGER REFERENCES purchase_receipt_lines,
  sales_order_line_id INTEGER REFERENCES sales_order_lines,stock_count_line_id INTEGER,reason TEXT,occurred_at TEXT NOT NULL,
  FOREIGN KEY(stock_count_line_id,product_id) REFERENCES e_count_lines(id,product_id),
  UNIQUE(movement_type,purchase_receipt_line_id),UNIQUE(movement_type,sales_order_line_id),UNIQUE(movement_type,stock_count_line_id));
CREATE INDEX by_product_time ON stock_movements(product_id,occurred_at,id);
