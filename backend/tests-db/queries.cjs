const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { createApp } = require('../dist/app.js');
const { createDatabase } = require('../dist/db.js');
const { applyMigrations } = require('../scripts/setup-catalog.cjs');

async function main() {
  const env = process.env;
  assert.equal(env.LAB_MYSQL_HOST, '127.0.0.1');
  assert.equal(env.LAB_MYSQL_PORT, '3308');
  assert.equal(env.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.notEqual(env.LAB_MYSQL_PORT, env.APP_MYSQL_PORT);
  assert.ok(env.LAB_MYSQL_ROOT_PASSWORD);
  assert.notEqual(env.LAB_MYSQL_ROOT_PASSWORD, env.APP_MYSQL_ROOT_PASSWORD);
  const schema = 'partstock_c_test_' + randomBytes(8).toString('hex');
  const options = { host: env.LAB_MYSQL_HOST, port: Number(env.LAB_MYSQL_PORT), user: 'root',
    password: env.LAB_MYSQL_ROOT_PASSWORD, connectTimeout: 5000, multipleStatements: true };
  const admin = await mysql.createConnection(options);
  let created = false;
  let database;
  let server;
  try {
    await admin.query(`CREATE DATABASE ${schema}`);
    created = true;
    await admin.query(`USE ${schema}`);
    // Catalog-only schema first: UC05-06/11 must degrade cleanly until D's migration 003 exists.
    for (const file of ['001_catalogs.sql', '002_products_suppliers.sql']) {
      await admin.query(readFileSync(resolve(__dirname, '../../database/mysql/migrations', file), 'utf8'));
    }
    for (const file of ['001_catalogs.sql', '002_products_suppliers.sql']) {
      await admin.query(readFileSync(resolve(__dirname, '../../database/seed', file), 'utf8'));
    }
    database = createDatabase({ ...options, database: schema, multipleStatements: false });
    const staff = randomBytes(24).toString('hex');
    const manager = randomBytes(24).toString('hex');
    server = createApp(database.check, {
      store: database.catalog, products: database.products, queries: database.queries,
      staffToken: staff, managerToken: manager,
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    async function get(path, token, status = 200) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`,
        { headers: token ? { Authorization: 'Bearer ' + token } : {} });
      assert.equal(response.status, status, path);
      return response.json();
    }
    await get('product-search', undefined, 401);
    await get('products', staff, 403);
    const lookup = await get('product-search?q=ram-kin-08', staff);
    assert.equal(lookup.stock_available, false);
    assert.deepEqual(lookup.items.map(item => item.sku), ['RAM-KIN-08']);
    assert.equal(lookup.items[0].quantity_on_hand, null);
    assert.equal((await get('product-search?q=DDR4', manager)).items.length, 2);
    assert.equal((await get('product-search?q=%25', staff)).items.length, 0);
    assert.equal((await get('product-search?q=SSD-SAM-500', staff)).items.length, 0);
    assert.equal((await get('product-search?limit=1', staff)).has_more, true);
    await get('product-search?min_price=500&max_price=1', staff, 400);
    assert.equal((await get('product-search?stock=in', staff, 503)).error.code, 'STOCK_UNAVAILABLE');
    const period = 'revenue?from=2026-11-01&to=2026-12-01';
    await get(period, staff, 403);
    await get(period, manager, 503);
    await get('product-search?never_sold=true', manager, 503);
    await get('revenue?from=2026-02-30&to=2026-12-01', manager, 400);

    // Migration 003 backfills a zero stock row for the already-seeded products.
    assert.deepEqual(await applyMigrations(admin), ['003_inventory_documents.sql', '004_inventory_low_threshold.sql']);
    assert.equal((await get('product-search?q=ram-kin-08', staff)).items[0].quantity_on_hand, 0);
    assert.deepEqual(await get(period, manager), { from: '2026-11-01', to: '2026-12-01', revenue_vnd: '0', order_count: '0' });
    // Read fixtures written straight into D's real tables, scoped to this disposable lab schema.
    await admin.query(`
      UPDATE inventory SET quantity_on_hand = 3 WHERE product_id = (SELECT id FROM products WHERE sku = 'RAM-KIN-08');
      INSERT INTO sales_orders (id, code, status, confirmed_at, cancelled_at, cancel_reason) VALUES
        (1, 'DB-T-1', 'CONFIRMED', '2026-11-01', NULL, NULL),
        (2, 'DB-T-2', 'CANCELLED', '2026-11-15', '2026-11-16', 'Khach doi y'),
        (3, 'DB-T-3', 'CONFIRMED', '2026-12-01', NULL, NULL),
        (4, 'DB-T-4', 'DRAFT', NULL, NULL, NULL);
      INSERT INTO sales_order_lines (order_id, product_id, quantity, unit_price)
        SELECT 1,id,2,420000 FROM products WHERE sku='RAM-KIN-08'
        UNION ALL SELECT 1,id,1,790000 FROM products WHERE sku='RAM-KIN-16'
        UNION ALL SELECT 2,id,1,999999 FROM products WHERE sku='SSD-KIN-500'
        UNION ALL SELECT 3,id,1,999999 FROM products WHERE sku='RAM-KIN-08'
        UNION ALL SELECT 4,id,1,999999 FROM products WHERE sku='SSD-SAM-1000';
    `);
    const { categories, brands } = await get('product-search/facets', staff);
    const category = categories.find(item => item.name === 'RAM');
    const brand = brands.find(item => item.name === 'Kingston');
    const combined = await get(`product-search?category_id=${category.id}&brand_id=${brand.id}&min_price=420000&max_price=790000&stock=in`, staff);
    assert.deepEqual(combined.items.map(item => [item.sku, item.quantity_on_hand]), [['RAM-KIN-08', 3]]);
    assert.equal((await get('product-search?stock=out', staff)).items.length, 3);
    assert.deepEqual((await get('product-search?never_sold=true', staff)).items.map(item => item.sku), ['SSD-SAM-1000']);
    assert.deepEqual(await get(period, manager), {
      from: '2026-11-01', to: '2026-12-01', revenue_vnd: '1630000', order_count: '1',
    });
    assert.equal((await get('revenue?from=2027-01-01&to=2027-02-01', manager)).revenue_vnd, '0');
    console.log('PASS: UC05/06/11 HTTP, role checks, schema unavailable, backfilled stock, combined stock filter and revenue boundaries.');
  } finally {
    if (server) await new Promise(resolveClose => server.close(resolveClose));
    if (database) await database.close();
    if (created) await admin.query(`DROP DATABASE ${schema}`);
    await admin.end();
  }
}

main().catch(error => {
  console.error('FAIL:', error.code || error.message);
  process.exitCode = 1;
});
