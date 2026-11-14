SELECT JSON_OBJECT('version', VERSION(), 'database', DATABASE(),
                   'innodb_buffer_pool_size', @@innodb_buffer_pool_size);

CREATE /* TABLE_SCOPE */ TABLE indexing_products (
    id INT UNSIGNED NOT NULL PRIMARY KEY,
    sku VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    brand_id INT UNSIGNED NOT NULL,
    selling_price DECIMAL(15,0) NOT NULL
) ENGINE=InnoDB /* TABLE_OPTIONS */;

/* SEED */

SELECT '::indexes_before';
SHOW INDEX FROM indexing_products;
SELECT '::rows';
SELECT COUNT(*) FROM indexing_products;

/* EXPLAIN BEFORE */
/* SIZE BEFORE */
/* UPDATE BEFORE */

ALTER TABLE indexing_products ADD INDEX idx_sku (sku);
ALTER TABLE indexing_products ADD INDEX idx_brand_price (brand_id, selling_price);
SELECT '::indexes_after';
SHOW INDEX FROM indexing_products;

/* EXPLAIN AFTER */
/* SIZE AFTER */
/* UPDATE AFTER */

SELECT '::sku_result';
SELECT JSON_ARRAY(sku, name, brand_id, CAST(selling_price AS UNSIGNED))
FROM indexing_products WHERE sku = 'IDX-0004201';
SELECT '::brand_price_result';
SELECT JSON_ARRAY(sku, name, brand_id, CAST(selling_price AS UNSIGNED))
FROM indexing_products WHERE brand_id = 7 AND selling_price BETWEEN 500000 AND 520000
ORDER BY sku;
