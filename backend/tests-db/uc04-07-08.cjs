// UC04 / UC07 / UC08 over HTTP -> MySQL lab. Fresh disposable schema on the LAB service only.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { createApp } = require('../dist/app.js');
const { createDatabase } = require('../dist/db.js');
const { applyMigrations } = require('../scripts/setup-catalog.cjs');

// F03 §5 invariants. Every query must return no rows.
const invariants = {
  'I1 stock >= 0': 'SELECT product_id FROM inventory WHERE quantity_on_hand < 0',
  'I2 stock = ledger sum': `
    SELECT i.product_id FROM inventory i LEFT JOIN stock_movements m ON m.product_id = i.product_id
    GROUP BY i.product_id, i.quantity_on_hand HAVING i.quantity_on_hand <> COALESCE(SUM(m.quantity_delta), 0)`,
  'I3 receipt lines vs IMPORT': `
    SELECT l.id FROM purchase_receipt_lines l JOIN purchase_receipts r ON r.id = l.receipt_id
    LEFT JOIN stock_movements m ON m.purchase_receipt_line_id = l.id AND m.movement_type = 'IMPORT'
    GROUP BY l.id, r.status HAVING COUNT(m.id) <> IF(r.status = 'CONFIRMED', 1, 0)`,
  'I4 order lines vs SALE/SALE_CANCEL': `
    SELECT l.id, o.status, COALESCE(SUM(m.movement_type = 'SALE'), 0) AS sale_cnt,
           COALESCE(SUM(m.movement_type = 'SALE_CANCEL'), 0) AS cancel_cnt
    FROM sales_order_lines l JOIN sales_orders o ON o.id = l.order_id
    LEFT JOIN stock_movements m ON m.sales_order_line_id = l.id
    GROUP BY l.id, o.status
    HAVING NOT ((o.status = 'DRAFT' AND sale_cnt = 0 AND cancel_cnt = 0)
             OR (o.status = 'CONFIRMED' AND sale_cnt = 1 AND cancel_cnt = 0)
             OR (o.status = 'CANCELLED' AND sale_cnt = 1 AND cancel_cnt = 1))`,
  'I5 delta = +/- line quantity': `
    SELECT m.id FROM stock_movements m
    LEFT JOIN purchase_receipt_lines pl ON pl.id = m.purchase_receipt_line_id
    LEFT JOIN sales_order_lines sl ON sl.id = m.sales_order_line_id
    WHERE (m.movement_type = 'IMPORT' AND m.quantity_delta <> pl.quantity)
       OR (m.movement_type = 'SALE' AND m.quantity_delta <> -sl.quantity)
       OR (m.movement_type = 'SALE_CANCEL' AND m.quantity_delta <> sl.quantity)`,
};

async function main() {
  const env = process.env;
  assert.equal(env.LAB_MYSQL_HOST, '127.0.0.1');
  assert.equal(env.LAB_MYSQL_PORT, '3308');
  assert.equal(env.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.notEqual(env.LAB_MYSQL_PORT, env.APP_MYSQL_PORT);
  assert.ok(env.LAB_MYSQL_ROOT_PASSWORD);
  assert.notEqual(env.LAB_MYSQL_ROOT_PASSWORD, env.APP_MYSQL_ROOT_PASSWORD);
  const schema = 'partstock_d_test_' + randomBytes(8).toString('hex');
  const options = {
    host: env.LAB_MYSQL_HOST, port: Number(env.LAB_MYSQL_PORT), user: 'root',
    password: env.LAB_MYSQL_ROOT_PASSWORD, connectTimeout: 5000, multipleStatements: true,
    supportBigNumbers: true, bigNumberStrings: true,
  };
  const admin = await mysql.createConnection(options);
  let created = false;
  let database;
  let server;
  try {
    await admin.query(`CREATE DATABASE ${schema}`);
    created = true;
    await admin.query(`USE ${schema}`);
    await applyMigrations(admin);
    for (const file of ['001_catalogs.sql', '002_products_suppliers.sql', '003_inventory_documents.sql']) {
      await admin.query(readFileSync(resolve(__dirname, '../../database/seed', file), 'utf8'));
    }
    database = createDatabase({ ...options, database: schema, multipleStatements: false, connectionLimit: 10 });
    const staff = randomBytes(24).toString('hex');
    const manager = randomBytes(24).toString('hex');
    server = createApp(database.check, {
      store: database.catalog, products: database.products, suppliers: database.suppliers,
      queries: database.queries, purchases: database.purchases, sales: database.sales,
      staffToken: staff, managerToken: manager,
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;

    async function call(method, path, token, body, status) {
      const response = await fetch(base + path, {
        method,
        headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (status !== undefined) assert.equal(response.status, status, `${method} ${path} -> ${response.status} ${text}`);
      return { status: response.status, data };
    }
    const ok = async (...args) => (await call(...args)).data;
    const stockOf = async sku => Number((await admin.query(
      'SELECT i.quantity_on_hand AS q FROM inventory i JOIN products p ON p.id = i.product_id WHERE p.sku = ?', [sku],
    ))[0][0].q);
    const count = async (table, where = '1=1') => Number((await admin.query(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`))[0][0].n);
    async function checkInvariants(label) {
      for (const [name, sql] of Object.entries(invariants)) {
        const [rows] = await admin.query(sql);
        assert.deepEqual(rows, [], `${label}: ${name} violated`);
      }
    }
    let adjustment = 900000;
    // Test setup only: move stock and keep the ledger consistent with a matching ADJUSTMENT row.
    async function setStock(id, quantity) {
      const [[row]] = await admin.query('SELECT quantity_on_hand AS q FROM inventory WHERE product_id = ?', [id]);
      const delta = quantity - Number(row.q);
      if (delta === 0) return;
      await admin.query('UPDATE inventory SET quantity_on_hand = ? WHERE product_id = ?', [quantity, id]);
      await admin.query(
        "INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, stock_count_line_id, reason, occurred_at) VALUES (?, 'ADJUSTMENT', ?, ?, ?, 'Test setup', NOW(3))",
        [id, delta, quantity, ++adjustment]);
    }
    const productId = async sku => String((await admin.query('SELECT id FROM products WHERE sku = ?', [sku]))[0][0].id);
    const supplierA = String((await admin.query("SELECT id FROM suppliers WHERE name = 'Nha cung cap mau A'"))[0][0].id);
    const ram8 = await productId('RAM-KIN-08');
    const ram16 = await productId('RAM-KIN-16');
    const ssd500 = await productId('SSD-KIN-500');
    const ssd1t = await productId('SSD-SAM-1000');
    const ssdOld = await productId('SSD-SAM-500');

    // ---- Baseline from the seed -------------------------------------------------------------------
    assert.deepEqual(
      [await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16'), await stockOf('SSD-KIN-500'), await stockOf('SSD-SAM-1000'), await stockOf('SSD-SAM-500')],
      [8, 5, 8, 4, 0],
    );
    assert.equal(await count('stock_movements'), 7);
    await checkInvariants('seed');
    console.log('PASS: seed 003 loads 25 units, 7 ledger rows and satisfies invariants I1-I5.');

    // ---- Access rules -----------------------------------------------------------------------------
    await call('GET', '/purchase-receipts', undefined, undefined, 401);
    await call('GET', '/purchase-receipts', 'wrong-token', undefined, 403);
    await call('GET', '/sales-orders', staff, undefined, 200);
    await call('POST', '/sales-orders/1/cancel', staff, { reason: 'x' }, 403);
    console.log('PASS: 401 without token, 403 for a wrong token, staff may not cancel (UC08 is Manager only).');

    // ---- New product gets its stock row (F03 Q6) ----------------------------------------------------
    const [[parent]] = await admin.query('SELECT category_id, brand_id FROM products WHERE id = ?', [ram8]);
    const newProduct = await ok('POST', '/products', manager, {
      sku: 'RAM-NEW-04', name: 'RAM moi', category_id: String(parent.category_id), brand_id: String(parent.brand_id), selling_price: 300000,
    }, 201);
    assert.equal(await stockOf('RAM-NEW-04'), 0);
    await call('PATCH', `/products/${newProduct.id}`, manager, { selling_price: 310000 }, 200);
    console.log('PASS: POST /api/products creates the zero stock row in the same transaction.');

    // ---- UC04 purchase receipts ---------------------------------------------------------------------
    const draft = await ok('POST', '/purchase-receipts', staff, {
      supplier_id: supplierA, note: '  Hang ve sang  ',
      lines: [{ product_id: ram8, quantity: 5, unit_cost: 360000 }, { product_id: ssd500, quantity: 2, unit_cost: 800000 }],
    }, 201);
    assert.match(draft.code, /^PN-\d{8}-\d{6}$/);
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.note, 'Hang ve sang');
    assert.equal(draft.line_count, 2);
    assert.equal(draft.total_cost_vnd, String(5 * 360000 + 2 * 800000));
    assert.equal(draft.confirmed_at, null);
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('SSD-KIN-500')], [8, 8], 'draft must not change stock');
    assert.equal(await count('stock_movements'), 7);
    await call('POST', '/purchase-receipts', staff, { supplier_id: supplierA, lines: [{ product_id: ssdOld, quantity: 1, unit_cost: 1 }] }, 409)
      .then(result => assert.equal(result.data.error.code, 'PRODUCT_DISCONTINUED'));
    await call('POST', '/purchase-receipts', staff, { supplier_id: supplierA, lines: [{ product_id: '999999', quantity: 1, unit_cost: 1 }] }, 400)
      .then(result => assert.equal(result.data.error.code, 'INVALID_REFERENCE'));
    await call('POST', '/purchase-receipts', staff, { supplier_id: '999999', lines: [] }, 400)
      .then(result => assert.equal(result.data.error.code, 'INVALID_REFERENCE'));
    for (const bad of [
      { supplier_id: supplierA, lines: [{ product_id: ram8, quantity: 1, unit_cost: 1 }, { product_id: ram8, quantity: 2, unit_cost: 1 }] },
      { supplier_id: supplierA, lines: [{ product_id: ram8, quantity: 0, unit_cost: 1 }] },
      { supplier_id: supplierA, lines: [{ product_id: ram8, quantity: 1.5, unit_cost: 1 }] },
      { supplier_id: supplierA, lines: [{ product_id: ram8, quantity: 1, unit_cost: -1 }] },
      { supplier_id: supplierA, lines: [{ product_id: ram8, quantity: 1 }] },
      { supplier_id: supplierA, extra: true },
    ]) await call('POST', '/purchase-receipts', staff, bad, 400);
    assert.equal(await count('purchase_receipts'), 2, 'rejected drafts leave no rows behind');

    const replaced = await ok('PUT', `/purchase-receipts/${draft.id}`, staff, {
      supplier_id: supplierA, lines: [{ product_id: ram8, quantity: 6, unit_cost: 360000 }, { product_id: ssd500, quantity: 2, unit_cost: 800000 }],
    }, 200);
    assert.deepEqual(replaced.lines.map(line => [line.sku, line.quantity]), [['RAM-KIN-08', 6], ['SSD-KIN-500', 2]]);

    const empty = await ok('POST', '/purchase-receipts', staff, { supplier_id: supplierA }, 201);
    await call('POST', `/purchase-receipts/${empty.id}/confirm`, staff, undefined, 409)
      .then(result => assert.equal(result.data.error.code, 'EMPTY_DOCUMENT'));
    assert.equal((await ok('GET', `/purchase-receipts/${empty.id}`, staff, undefined, 200)).status, 'DRAFT');
    await call('DELETE', `/purchase-receipts/${empty.id}`, staff, undefined, 204);
    await call('GET', `/purchase-receipts/${empty.id}`, staff, undefined, 404);
    await call('DELETE', `/purchase-receipts/${empty.id}`, staff, undefined, 404);

    const confirmed = await ok('POST', `/purchase-receipts/${draft.id}/confirm`, staff, undefined, 200);
    assert.equal(confirmed.status, 'CONFIRMED');
    assert.ok(confirmed.confirmed_at);
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('SSD-KIN-500')], [14, 10]);
    assert.equal(await count('stock_movements', "movement_type = 'IMPORT'"), 6);
    const [[importRow]] = await admin.query(
      `SELECT quantity_after, CAST(occurred_at AS CHAR) AS at FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT 1`, [ram8],
    );
    assert.equal(Number(importRow.quantity_after), 14);
    assert.equal(importRow.at, confirmed.confirmed_at, 'ledger time equals the document confirmation time');
    await checkInvariants('after receipt confirm');
    // Repeated / late operations change nothing.
    await call('POST', `/purchase-receipts/${draft.id}/confirm`, staff, undefined, 409)
      .then(result => assert.deepEqual(result.data.error, { code: 'RECEIPT_NOT_DRAFT', status: 'CONFIRMED' }));
    await call('PUT', `/purchase-receipts/${draft.id}`, staff, { supplier_id: supplierA, lines: [] }, 409);
    await call('DELETE', `/purchase-receipts/${draft.id}`, staff, undefined, 409);
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('SSD-KIN-500')], [14, 10]);
    assert.equal(await count('stock_movements', "movement_type = 'IMPORT'"), 6);
    assert.equal((await ok('GET', '/purchase-receipts?status=CONFIRMED', staff, undefined, 200)).length, 2);
    assert.equal((await ok('GET', '/purchase-receipts/suppliers', staff, undefined, 200)).length, 2);
    await call('GET', '/purchase-receipts?status=NOPE', staff, undefined, 400);
    await checkInvariants('after repeated receipt operations');
    console.log('PASS: UC04 draft/replace/delete, validation, confirm adds stock once with matching ledger rows, repeats rejected.');

    // ---- UC07 sales orders --------------------------------------------------------------------------
    const order = await ok('POST', '/sales-orders', staff, {
      customer_name: 'Khach thu', lines: [{ product_id: ram8, quantity: 3 }, { product_id: ram16, quantity: 2 }],
    }, 201);
    assert.match(order.code, /^DB-\d{8}-\d{6}$/);
    assert.deepEqual(order.lines.map(line => line.unit_price_vnd), ['420000', '790000'], 'draft shows the provisional current price');
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')], [14, 5], 'draft must not change stock');
    await call('PATCH', `/products/${ram8}`, manager, { selling_price: 430000 }, 200);
    const sold = await ok('POST', `/sales-orders/${order.id}/confirm`, staff, undefined, 200);
    assert.equal(sold.status, 'CONFIRMED');
    assert.deepEqual(sold.lines.map(line => line.unit_price_vnd), ['430000', '790000'], 'price is fixed at confirmation');
    assert.equal(sold.total_vnd, String(3 * 430000 + 2 * 790000));
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')], [11, 3]);
    await call('PATCH', `/products/${ram8}`, manager, { selling_price: 999000 }, 200);
    assert.equal((await ok('GET', `/sales-orders/${order.id}`, staff, undefined, 200)).lines[0].unit_price_vnd, '430000', 'later price change does not touch history (I6)');
    await call('POST', `/sales-orders/${order.id}/confirm`, staff, undefined, 409)
      .then(result => assert.deepEqual(result.data.error, { code: 'ORDER_NOT_DRAFT', status: 'CONFIRMED' }));
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')], [11, 3]);
    await checkInvariants('after sale');

    // Not enough stock on the second line: nothing at all may be applied.
    const short = await ok('POST', '/sales-orders', staff, {
      lines: [{ product_id: ram16, quantity: 1 }, { product_id: ssd1t, quantity: 99 }],
    }, 201);
    const movementsBefore = await count('stock_movements');
    await call('POST', `/sales-orders/${short.id}/confirm`, staff, undefined, 409)
      .then(result => assert.deepEqual(result.data.error, { code: 'INSUFFICIENT_STOCK', sku: 'SSD-SAM-1000', requested: 99, available: 4 }));
    assert.deepEqual([await stockOf('RAM-KIN-16'), await stockOf('SSD-SAM-1000')], [3, 4], 'line 1 rolled back with the failed line 2');
    assert.equal((await ok('GET', `/sales-orders/${short.id}`, staff, undefined, 200)).status, 'DRAFT');
    assert.equal(await count('stock_movements'), movementsBefore);
    assert.equal(await count('sales_orders', `id = ${short.id} AND confirmed_at IS NULL`), 1);
    await checkInvariants('after rejected sale');

    // A product discontinued after the draft was saved blocks the confirmation but never the cancellation.
    const willStop = await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ssd1t, quantity: 1 }] }, 201);
    await admin.query("UPDATE products SET status = 'DISCONTINUED' WHERE sku = 'SSD-SAM-1000'");
    await call('POST', `/sales-orders/${willStop.id}/confirm`, staff, undefined, 409)
      .then(result => assert.deepEqual(result.data.error, { code: 'PRODUCT_DISCONTINUED', skus: ['SSD-SAM-1000'] }));
    await call('POST', '/sales-orders', staff, { lines: [{ product_id: ssd1t, quantity: 1 }] }, 409);
    await admin.query("UPDATE products SET status = 'ACTIVE' WHERE sku = 'SSD-SAM-1000'");
    await call('DELETE', `/sales-orders/${willStop.id}`, staff, undefined, 204);
    await call('DELETE', `/sales-orders/${short.id}`, staff, undefined, 204);
    await call('DELETE', `/sales-orders/${order.id}`, staff, undefined, 409);
    await call('PUT', `/sales-orders/${order.id}`, staff, { lines: [] }, 409);
    console.log('PASS: UC07 draft keeps stock, confirm fixes price and deducts once, short stock rolls the whole order back.');

    // ---- UC08 cancel --------------------------------------------------------------------------------
    await call('POST', `/sales-orders/${order.id}/cancel`, manager, {}, 400);
    await call('POST', `/sales-orders/${order.id}/cancel`, manager, { reason: '   ' }, 400);
    // F03 §1: a product discontinued after the sale does not block cancelling that order.
    const stopped = await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ram16, quantity: 1 }] }, 201);
    await ok('POST', `/sales-orders/${stopped.id}/confirm`, staff, undefined, 200);
    await admin.query("UPDATE products SET status = 'DISCONTINUED' WHERE sku = 'RAM-KIN-16'");
    assert.equal((await ok('POST', `/sales-orders/${stopped.id}/cancel`, manager, { reason: 'Hang ngung kinh doanh' }, 200)).status, 'CANCELLED');
    await admin.query("UPDATE products SET status = 'ACTIVE' WHERE sku = 'RAM-KIN-16'");
    const plain = await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ram16, quantity: 1 }] }, 201);
    await call('POST', `/sales-orders/${plain.id}/cancel`, manager, { reason: 'Nhap nham' }, 409)
      .then(result => assert.deepEqual(result.data.error, { code: 'ORDER_NOT_CANCELLABLE', status: 'DRAFT' }));
    await call('POST', '/sales-orders/999999/cancel', manager, { reason: 'x' }, 404);
    const [before8, before16] = [await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')];
    const [first, second] = await Promise.all([
      call('POST', `/sales-orders/${order.id}/cancel`, manager, { reason: 'Khach tra hang' }),
      call('POST', `/sales-orders/${order.id}/cancel`, manager, { reason: 'Khach tra hang' }),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [200, 409], 'concurrent double cancel: exactly one wins');
    const winner = first.status === 200 ? first.data : second.data;
    assert.equal(winner.status, 'CANCELLED');
    assert.equal(winner.cancel_reason, 'Khach tra hang');
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')], [before8 + 3, before16 + 2], 'stock returned exactly once');
    assert.equal(await count('stock_movements', `movement_type = 'SALE_CANCEL' AND sales_order_line_id IN (SELECT id FROM sales_order_lines WHERE order_id = ${order.id})`), 2);
    await call('POST', `/sales-orders/${order.id}/cancel`, manager, { reason: 'Lan nua' }, 409)
      .then(result => assert.equal(result.data.error.code, 'ORDER_NOT_CANCELLABLE'));
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')], [before8 + 3, before16 + 2]);
    await call('DELETE', `/sales-orders/${order.id}`, staff, undefined, 409);
    await call('DELETE', `/sales-orders/${plain.id}`, staff, undefined, 204);
    await checkInvariants('after cancel');
    console.log('PASS: UC08 Manager-only cancel restores every line once, repeated and concurrent cancels refund once.');

    // ---- Concurrency on the stock row ---------------------------------------------------------------
    // 1) Two different orders race for the last unit.
    await setStock(ssd1t, 1);
    const racers = [];
    for (let i = 0; i < 6; i++) racers.push((await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ssd1t, quantity: 1 }] }, 201)).id);
    const raced = await Promise.all(racers.map(id => call('POST', `/sales-orders/${id}/confirm`, staff)));
    assert.equal(raced.filter(result => result.status === 200).length, 1, 'only one of six orders gets the last unit');
    assert.ok(raced.filter(result => result.status !== 200).every(result => result.status === 409 && result.data.error.code === 'INSUFFICIENT_STOCK'));
    assert.equal(await stockOf('SSD-SAM-1000'), 0);
    assert.equal(await count('sales_orders', `id IN (${racers.join(',')}) AND status = 'CONFIRMED'`), 1);
    assert.equal(await count('sales_orders', `id IN (${racers.join(',')}) AND status = 'DRAFT'`), 5, 'losers stay editable drafts');
    // 2) Double confirmation of one order.
    await setStock(ssd1t, 5);
    const twice = await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ssd1t, quantity: 2 }] }, 201);
    const confirms = await Promise.all([1, 2, 3].map(() => call('POST', `/sales-orders/${twice.id}/confirm`, staff)));
    assert.deepEqual(confirms.map(result => result.status).sort(), [200, 409, 409]);
    assert.equal(await stockOf('SSD-SAM-1000'), 3, 'stock deducted once');
    // 3) Opposite line order on the same two products: ascending product_id locking avoids deadlocks.
    await setStock(ram8, 100);
    await setStock(ram16, 100);
    const crossing = [];
    for (let i = 0; i < 10; i++) {
      crossing.push((await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ram8, quantity: 1 }, { product_id: ram16, quantity: 1 }] }, 201)).id);
      crossing.push((await ok('POST', '/sales-orders', staff, { lines: [{ product_id: ram16, quantity: 1 }, { product_id: ram8, quantity: 1 }] }, 201)).id);
    }
    const crossed = await Promise.all(crossing.map(id => call('POST', `/sales-orders/${id}/confirm`, staff)));
    assert.deepEqual([...new Set(crossed.map(result => result.status))], [200], 'crossing orders all succeed');
    assert.deepEqual([await stockOf('RAM-KIN-08'), await stockOf('RAM-KIN-16')], [80, 80]);
    console.log('PASS: six orders race for one unit (one wins, five 409), triple confirm deducts once, 20 crossing orders never fail.');

    await checkInvariants('after concurrency');

    // ---- Reads used by C: stock and revenue follow the real documents --------------------------------
    const found = await ok('GET', '/product-search?q=SSD-KIN-500', staff, undefined, 200);
    assert.equal(found.items[0].quantity_on_hand, await stockOf('SSD-KIN-500'));
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 31 * 3600_000).toISOString().slice(0, 10);
    const [[expected]] = await admin.query(
      `SELECT CAST(COALESCE(SUM(l.quantity * l.unit_price), 0) AS CHAR) AS revenue
       FROM sales_orders o JOIN sales_order_lines l ON l.order_id = o.id
       WHERE o.status = 'CONFIRMED' AND o.confirmed_at >= ? AND o.confirmed_at < ?`, [today, tomorrow]);
    const revenue = await ok('GET', `/revenue?from=${today}&to=${tomorrow}`, manager, undefined, 200);
    assert.equal(revenue.revenue_vnd, expected.revenue);
    assert.ok(Number(revenue.revenue_vnd) > 0, 'orders confirmed today are counted; the cancelled one is not');
    console.log('PASS: UC06 stock and UC11 revenue read the real tables written by UC04/07/08.');
  } finally {
    if (server) await new Promise(resolveClose => server.close(resolveClose));
    if (database) await database.close();
    if (created) await admin.query(`DROP DATABASE ${schema}`);
    await admin.end();
  }
}

main().catch(error => {
  console.error('FAIL:', error.code || error.message);
  if (error.stack) console.error(error.stack.split('\n').slice(0, 4).join('\n'));
  process.exitCode = 1;
});
