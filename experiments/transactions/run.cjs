// Transaction lab (D): the same business cases on MySQL and MongoDB, with the same invariants.
// Run from the repo root after `npm run build --prefix backend`:
//   node --env-file=.env.docker experiments/transactions/run.cjs > experiments/transactions/results-local.json
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const backendRequire = createRequire(resolve(root, 'backend/package.json'));
const mysql = backendRequire('mysql2/promise');
const { createDatabase } = backendRequire('./dist/db.js');
const { applyMigrations } = backendRequire('./scripts/setup-catalog.cjs');
const compose = ['compose', '--env-file', '.env.docker', '-f', 'compose.local.yaml'];

// Same logical data on both systems. Stock matches database/seed/003_inventory_documents.sql.
const fixture = {
  products: [
    { sku: 'RAM-KIN-08', price: 420000, stock: 8 },
    { sku: 'RAM-KIN-16', price: 790000, stock: 5 },
    { sku: 'SSD-KIN-500', price: 990000, stock: 8 },
    { sku: 'SSD-SAM-1000', price: 1990000, stock: 4 },
  ],
  orders: [
    { label: 'O1', lines: [{ sku: 'RAM-KIN-08', quantity: 3 }, { sku: 'RAM-KIN-16', quantity: 2 }] },
    { label: 'O2', lines: [{ sku: 'RAM-KIN-08', quantity: 1 }] },
    { label: 'O3', lines: [{ sku: 'RAM-KIN-08', quantity: 2 }, { sku: 'RAM-KIN-16', quantity: 1 }] },
    { label: 'O4', lines: [{ sku: 'RAM-KIN-08', quantity: 1 }, { sku: 'SSD-SAM-1000', quantity: 5 }] },
    { label: 'O5', lines: [{ sku: 'SSD-KIN-500', quantity: 2 }] },
    { label: 'O6', lines: [{ sku: 'RAM-KIN-16', quantity: 1 }] },
  ],
};

// mode: transaction | abandon (client lost before COMMIT) | none (no transaction, baseline).
const cases = [
  { id: 1, name: 'commit', order: 'O1', action: 'confirm', mode: 'transaction', fault: null, expect: 'CONFIRMED',
    text: 'Xác nhận đơn hai dòng, không lỗi: commit' },
  { id: 2, name: 'fault_before_stock_update', order: 'O2', action: 'confirm', mode: 'transaction', fault: 'before_stock_update',
    expect: 'FAULT_INJECTED', text: 'Lỗi sau khi đổi trạng thái đơn, trước khi trừ tồn' },
  { id: 3, name: 'fault_before_ledger', order: 'O3', action: 'confirm', mode: 'transaction', fault: 'before_ledger',
    expect: 'FAULT_INJECTED', text: 'Lỗi sau khi trừ tồn dòng 1, trước khi ghi biến động' },
  { id: 4, name: 'insufficient_second_line', order: 'O4', action: 'confirm', mode: 'transaction', fault: null,
    expect: 'INSUFFICIENT_STOCK', text: 'Dòng 1 trừ được, dòng 2 thiếu tồn: toàn đơn quay lại' },
  { id: 5, name: 'connection_lost_before_commit', order: 'O5', action: 'confirm', mode: 'abandon', fault: null,
    expect: 'CONNECTION_LOST', text: 'Mọi thao tác ghi đã xong, client mất kết nối trước COMMIT' },
  { id: 6, name: 'repeat_confirm', order: 'O1', action: 'confirm', mode: 'transaction', fault: null,
    expect: 'ORDER_NOT_DRAFT', text: 'Gửi lại xác nhận đơn đã xác nhận' },
  { id: 7, name: 'cancel', order: 'O1', action: 'cancel', mode: 'transaction', fault: null,
    expect: 'CANCELLED', text: 'Hủy đơn đã xác nhận: hoàn tồn đủ mọi dòng' },
  { id: 8, name: 'repeat_cancel', order: 'O1', action: 'cancel', mode: 'transaction', fault: null,
    expect: 'ORDER_NOT_CANCELLABLE', text: 'Gửi lại yêu cầu hủy: không hoàn kho lần hai' },
  { id: 9, name: 'retry_after_failure', order: 'O2', action: 'confirm', mode: 'transaction', fault: null,
    expect: 'CONFIRMED', text: 'Đơn từng lỗi ở ca 2 vẫn là nháp và xác nhận được khi hết lỗi' },
  { id: 10, name: 'baseline_without_transaction', order: 'O6', action: 'confirm', mode: 'none', fault: 'before_ledger',
    expect: 'FAULT_INJECTED', text: 'Đối chứng: cùng lỗi ca 3 nhưng không dùng giao dịch' },
];

function sleep(ms) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms));
}

// ---- MySQL -------------------------------------------------------------------------------------------
const invariantSql = {
  I1: 'SELECT product_id FROM inventory WHERE quantity_on_hand < 0',
  I2: `SELECT i.product_id FROM inventory i LEFT JOIN stock_movements m ON m.product_id = i.product_id
       GROUP BY i.product_id, i.quantity_on_hand HAVING i.quantity_on_hand <> COALESCE(SUM(m.quantity_delta), 0)`,
  I4: `SELECT l.id FROM sales_order_lines l JOIN sales_orders o ON o.id = l.order_id
       LEFT JOIN stock_movements m ON m.sales_order_line_id = l.id
       GROUP BY l.id, o.status
       HAVING NOT ((o.status = 'DRAFT' AND COALESCE(SUM(m.movement_type = 'SALE'), 0) = 0 AND COALESCE(SUM(m.movement_type = 'SALE_CANCEL'), 0) = 0)
                OR (o.status = 'CONFIRMED' AND COALESCE(SUM(m.movement_type = 'SALE'), 0) = 1 AND COALESCE(SUM(m.movement_type = 'SALE_CANCEL'), 0) = 0)
                OR (o.status = 'CANCELLED' AND COALESCE(SUM(m.movement_type = 'SALE'), 0) = 1 AND COALESCE(SUM(m.movement_type = 'SALE_CANCEL'), 0) = 1))`,
};

function mysqlCode(error) {
  if (error?.sqlMessage?.startsWith('LAB fault')) return 'FAULT_INJECTED';
  if (['PROTOCOL_CONNECTION_LOST', 'ER_QUERY_INTERRUPTED', 'ER_CONNECTION_KILLED', 'ECONNRESET'].includes(error?.code)) return 'CONNECTION_LOST';
  return error?.code ?? error?.message ?? 'ERROR';
}

async function mysqlPart() {
  const env = process.env;
  assert.equal(env.LAB_MYSQL_HOST, '127.0.0.1');
  assert.equal(env.LAB_MYSQL_PORT, '3308');
  assert.equal(env.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.notEqual(env.LAB_MYSQL_PORT, env.APP_MYSQL_PORT);
  assert.ok(env.LAB_MYSQL_ROOT_PASSWORD);
  const schema = 'partstock_tx_' + randomBytes(6).toString('hex');
  const options = {
    host: env.LAB_MYSQL_HOST, port: Number(env.LAB_MYSQL_PORT), user: 'root', password: env.LAB_MYSQL_ROOT_PASSWORD,
    connectTimeout: 5000, multipleStatements: true, supportBigNumbers: true, bigNumberStrings: true,
  };
  const admin = await mysql.createConnection(options);
  let created = false;
  let database;
  let baseline;
  try {
    await admin.query(`CREATE DATABASE ${schema}`);
    created = true;
    await admin.query(`USE ${schema}`);
    await applyMigrations(admin);
    for (const file of ['001_catalogs.sql', '002_products_suppliers.sql', '003_inventory_documents.sql']) {
      await admin.query(readFileSync(resolve(root, 'database/seed', file), 'utf8'));
    }
    const [first, ...triggers] = readFileSync(resolve(__dirname, 'mysql-faults.sql'), 'utf8').split(/\n(?=CREATE TRIGGER)/);
    await admin.query(first);
    for (const trigger of triggers) await admin.query(trigger);

    const [[meta]] = await admin.query('SELECT VERSION() AS version, @@transaction_isolation AS isolation');
    database = createDatabase({ ...options, database: schema, multipleStatements: false, connectionLimit: 5 });
    const productId = {};
    for (const product of fixture.products) {
      const [[row]] = await admin.query('SELECT p.id, i.quantity_on_hand AS stock FROM products p JOIN inventory i ON i.product_id = p.id WHERE p.sku = ?', [product.sku]);
      assert.equal(Number(row.stock), product.stock, `seed stock of ${product.sku} drifted from the lab fixture`);
      productId[product.sku] = String(row.id);
    }
    const orderId = {};
    for (const order of fixture.orders) {
      const doc = await database.sales.create({
        customer_name: null, note: 'LAB ' + order.label,
        lines: order.lines.map(line => ({ product_id: productId[line.sku], quantity: line.quantity })),
      });
      orderId[order.label] = doc.id;
    }
    const labIds = Object.values(orderId).join(',');
    const labels = Object.fromEntries(Object.entries(orderId).map(([label, id]) => [id, label]));

    async function snapshot() {
      const [orderRows] = await admin.query(`SELECT CAST(id AS CHAR) AS id, status FROM sales_orders WHERE id IN (${labIds}) ORDER BY id`);
      const [stockRows] = await admin.query('SELECT p.sku, i.quantity_on_hand AS q FROM inventory i JOIN products p ON p.id = i.product_id WHERE p.sku IN (?) ORDER BY p.sku', [fixture.products.map(p => p.sku)]);
      const [moveRows] = await admin.query(
        `SELECT movement_type AS type, COUNT(*) AS n FROM stock_movements
         WHERE sales_order_line_id IN (SELECT id FROM sales_order_lines WHERE order_id IN (${labIds})) GROUP BY movement_type`);
      const movements = { SALE: 0, SALE_CANCEL: 0 };
      for (const row of moveRows) movements[row.type] = Number(row.n);
      const violations = [];
      for (const [name, sql] of Object.entries(invariantSql)) if ((await admin.query(sql))[0].length > 0) violations.push(name);
      return {
        orders: Object.fromEntries(orderRows.map(row => [labels[row.id], row.status])),
        stock: Object.fromEntries(stockRows.map(row => [row.sku, Number(row.q)])),
        movements, violations,
      };
    }
    const arm = (point, on) => admin.query('UPDATE lab_faults SET armed = ? WHERE point = ?', [on ? 1 : 0, point]);

    const results = [];
    for (const step of cases) {
      let result;
      if (step.mode === 'transaction') {
        if (step.fault) await arm(step.fault, true);
        try {
          if (step.action === 'confirm') await database.sales.confirm(orderId[step.order]);
          else await database.sales.cancel(orderId[step.order], 'LAB cancel');
          result = step.action === 'confirm' ? 'CONFIRMED' : 'CANCELLED';
        } catch (error) {
          result = mysqlCode(error);
        } finally {
          if (step.fault) await arm(step.fault, false);
        }
      } else if (step.mode === 'abandon') {
        await arm('hang_before_commit', true);
        const attempt = database.sales.confirm(orderId[step.order]).then(() => 'CONFIRMED', mysqlCode);
        let victim;
        for (let i = 0; i < 100 && victim === undefined; i++) {
          const [rows] = await admin.query('SELECT id FROM information_schema.processlist WHERE db = ? AND state = ?', [schema, 'User sleep']);
          victim = rows[0]?.id;
          if (victim === undefined) await sleep(100);
        }
        assert.ok(victim, 'the transaction never reached the pre-COMMIT point');
        await admin.query(`KILL CONNECTION ${Number(victim)}`);
        result = await attempt;
        await arm('hang_before_commit', false);
      } else {
        // No transaction: every statement autocommits, so a failure leaves earlier statements applied.
        baseline = await mysql.createConnection({ ...options, database: schema, multipleStatements: false });
        await arm(step.fault, true);
        try {
          await baseline.query("UPDATE sales_orders SET status = 'CONFIRMED', confirmed_at = NOW(3) WHERE id = ? AND status = 'DRAFT'", [orderId[step.order]]);
          const [lines] = await baseline.query('SELECT id, product_id, quantity FROM sales_order_lines WHERE order_id = ? ORDER BY product_id', [orderId[step.order]]);
          for (const line of lines) {
            await baseline.query('UPDATE inventory SET quantity_on_hand = quantity_on_hand - ? WHERE product_id = ? AND quantity_on_hand >= ?', [line.quantity, line.product_id, line.quantity]);
            const [[after]] = await baseline.query('SELECT quantity_on_hand AS q FROM inventory WHERE product_id = ?', [line.product_id]);
            await baseline.query(
              "INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, sales_order_line_id, occurred_at) VALUES (?, 'SALE', ?, ?, ?, NOW(3))",
              [line.product_id, -line.quantity, after.q, line.id]);
          }
          result = 'CONFIRMED';
        } catch (error) {
          result = mysqlCode(error);
        } finally {
          await arm(step.fault, false);
        }
      }
      results.push({ id: step.id, result, state: await snapshot() });
    }
    return { version: meta.version, isolation: meta.isolation, results };
  } finally {
    if (baseline) await baseline.end().catch(() => {});
    if (database) await database.close().catch(() => {});
    if (created) await admin.query(`DROP DATABASE ${schema}`);
    await admin.end();
  }
}

// ---- MongoDB -----------------------------------------------------------------------------------------
function mongoPart() {
  const runId = randomBytes(12).toString('hex');
  const script = `const runId = '${runId}'; const fixture = ${JSON.stringify(fixture)}; const cases = ${JSON.stringify(cases)};\n`
    + readFileSync(resolve(__dirname, 'mongodb.js'), 'utf8');
  const command = 'test "$MONGO_LAB_DATABASE" = partstock_lab; test "$MONGO_LAB_USERNAME" = partstock_lab; file=$(mktemp /tmp/partstock-tx-XXXXXX.js); trap \'rm -f "$file"\' EXIT; cat > "$file"; '
    + 'mongosh --quiet "mongodb://127.0.0.1:27017/$MONGO_LAB_DATABASE?replicaSet=rs0&directConnection=true" --authenticationDatabase "$MONGO_LAB_DATABASE" --username "$MONGO_LAB_USERNAME" --password "$MONGO_LAB_PASSWORD" --file "$file"';
  const process = spawnSync('docker', [...compose, 'exec', '-T', 'mongo-lab', 'sh', '-eu', '-c', command],
    { cwd: root, input: script, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180_000 });
  if (process.status !== 0) {
    throw new Error(`mongo-lab exited with ${process.status}: ${process.stderr.trim().split('\n').slice(-6).join('\n')}`);
  }
  const line = process.stdout.split('\n').find(text => text.startsWith('RESULT '));
  assert.ok(line, 'MongoDB script returned no RESULT line');
  return JSON.parse(line.slice(7));
}

// ---- Compare -----------------------------------------------------------------------------------------
function normalise(state) {
  return { ...state, violations: [...new Set(state.violations.map(item => item.split(':')[0]))].sort() };
}

async function main() {
  const my = await mysqlPart();
  const mongo = mongoPart();
  const initial = Object.fromEntries(fixture.products.map(product => [product.sku, product.stock]));
  const checks = [];
  const check = (name, fn) => { fn(); checks.push(name); };
  const out = [];
  let afterCommit;
  for (const step of cases) {
    const m = my.results.find(item => item.id === step.id);
    const g = mongo.results.find(item => item.id === step.id);
    const mState = normalise(m.state);
    const gState = normalise(g.state);
    check(`case ${step.id}: both systems return ${step.expect}`, () => {
      assert.equal(m.result, step.expect, `MySQL case ${step.id}`);
      assert.equal(g.result, step.expect, `MongoDB case ${step.id}`);
    });
    check(`case ${step.id}: MySQL and MongoDB end in the same logical state`, () => assert.deepEqual(mState, gState));
    if (step.id === 1) afterCommit = mState;
    if ([2, 3, 4, 5, 6].includes(step.id)) {
      check(`case ${step.id}: failed or repeated confirm leaves everything as after case 1`, () => assert.deepEqual(mState, afterCommit));
    }
    if (step.id <= 9) check(`case ${step.id}: invariants I1, I2, I4 hold`, () => assert.deepEqual(mState.violations, []));
    out.push({
      id: step.id, name: step.name, description: step.text, order: step.order, action: step.action, mode: step.mode,
      injected_fault: step.fault, mysql: { result: m.result, state: m.state }, mongodb: { result: g.result, attempts: g.attempts, state: g.state },
    });
  }
  check('case 1: stock RAM-KIN-08 8->5 and RAM-KIN-16 5->3, two SALE rows', () => {
    assert.deepEqual(afterCommit.stock, { ...initial, 'RAM-KIN-08': 5, 'RAM-KIN-16': 3 });
    assert.deepEqual(afterCommit.movements, { SALE: 2, SALE_CANCEL: 0 });
  });
  const cancelled = normalise(my.results.find(item => item.id === 7).state);
  check('case 7: cancel restores both lines once (stock back to the initial values)', () => {
    assert.deepEqual(cancelled.stock, initial);
    assert.deepEqual(cancelled.movements, { SALE: 2, SALE_CANCEL: 2 });
  });
  check('case 8: repeated cancel leaves the state of case 7', () => assert.deepEqual(normalise(my.results.find(item => item.id === 8).state), cancelled));
  check('case 10: without a transaction the same fault leaves I2 and I4 broken on both systems', () => {
    assert.deepEqual(normalise(my.results.find(item => item.id === 10).state).violations, ['I2', 'I4']);
    assert.deepEqual(normalise(mongo.results.find(item => item.id === 10).state).violations, ['I2', 'I4']);
  });
  console.log(JSON.stringify({
    environment: {
      mysql: { version: my.version, engine: 'InnoDB', isolation: my.isolation, schema: 'disposable partstock_tx_* on mysql-lab (127.0.0.1:3308)' },
      mongodb: { version: mongo.version, topology: mongo.topology, members: mongo.members, transaction: 'snapshot read concern, majority write concern', ledger_indexes: mongo.ledger_indexes },
    },
    fixture, cases: out, checks_passed: checks.length, checks,
  }, null, 2));
}

main().catch(error => {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
});
