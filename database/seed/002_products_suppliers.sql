-- Run once on a clean lab schema after the UC01 seed and the UC02-03 draft DDL.
START TRANSACTION;

-- Resolve catalog IDs from their unique names. Missing entries fail the NOT NULL constraint.
INSERT INTO products (sku, name, category_id, brand_id, specifications, selling_price, status)
VALUES
    ('RAM-KIN-08', 'Kingston DDR4 8GB',
     (SELECT id FROM categories WHERE name = 'RAM'), (SELECT id FROM brands WHERE name = 'Kingston'),
     JSON_OBJECT('capacity_gb', 8, 'speed_mt_s', 3200), 420000, 'ACTIVE'),
    ('RAM-KIN-16', 'Kingston DDR4 16GB',
     (SELECT id FROM categories WHERE name = 'RAM'), (SELECT id FROM brands WHERE name = 'Kingston'),
     JSON_OBJECT('capacity_gb', 16, 'speed_mt_s', 3200), 790000, 'ACTIVE'),
    ('SSD-KIN-500', 'Kingston NVMe 500GB',
     (SELECT id FROM categories WHERE name = 'SSD'), (SELECT id FROM brands WHERE name = 'Kingston'),
     JSON_OBJECT('capacity_gb', 500, 'interface', 'NVMe'), 990000, 'ACTIVE'),
    ('SSD-SAM-500', 'Samsung SATA 500GB',
     (SELECT id FROM categories WHERE name = 'SSD'), (SELECT id FROM brands WHERE name = 'Samsung'),
     JSON_OBJECT('capacity_gb', 500, 'interface', 'SATA'), 1190000, 'DISCONTINUED'),
    ('SSD-SAM-1000', 'Samsung NVMe 1TB',
     (SELECT id FROM categories WHERE name = 'SSD'), (SELECT id FROM brands WHERE name = 'Samsung'),
     JSON_OBJECT('capacity_gb', 1000, 'interface', 'NVMe'), 1990000, 'ACTIVE');

INSERT INTO suppliers (name, email) VALUES
    ('Nha cung cap mau A', 'supplier-a@example.invalid'),
    ('Nha cung cap mau B', 'supplier-b@example.invalid');

COMMIT;
