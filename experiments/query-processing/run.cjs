const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const compose = ['compose', '--env-file', '.env.docker', '-f', 'compose.local.yaml'];

function run(service, command, input) {
  const process = spawnSync('docker', [...compose, 'exec', '-T', service, 'sh', '-eu', '-c', command],
    { cwd: root, input, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120_000 });
  if (process.status !== 0) {
    const detail = process.error?.message || process.stderr.trim().split('\n').map(line => line.slice(0, 240)).slice(-8).join('\n');
    throw new Error(`${service} exited with ${process.status}: ${detail}`);
  }
  return process.stdout.trim();
}

function mongoMetrics(explain) {
  function number(value) {
    return typeof value === 'object' && value !== null ? value.high * 2 ** 32 + (value.low >>> 0) : value;
  }
  function operators(plan) {
    if (!plan || typeof plan !== 'object') return [];
    return [
      ...(plan.stage ? [{ stage: plan.stage, index: plan.indexName }] : []),
      ...Object.values(plan).flatMap(operators),
    ];
  }
  const stages = explain.stages || [];
  const cursor = stages.find(stage => stage.$cursor)?.$cursor || explain;
  const stats = cursor.executionStats;
  return {
    plan: operators(cursor.queryPlanner.winningPlan.queryPlan || cursor.queryPlanner.winningPlan),
    cursor: {
      rows: number(stats.nReturned), keys: number(stats.totalKeysExamined),
      documents: number(stats.totalDocsExamined), milliseconds: number(stats.executionTimeMillis),
    },
    stages: stages.map(stage => ({
      stage: Object.keys(stage).find(key => key.startsWith('$')),
      rows: number(stage.nReturned), keys: number(stage.totalKeysExamined),
      documents: number(stage.totalDocsExamined), indexes: stage.indexesUsed,
      milliseconds_estimate: number(stage.executionTimeMillisEstimate),
    })),
  };
}

function seed() {
  const products = Array.from({ length: 2400 }, (_, i) => [
    i + 1, i % 4 + 1, Math.floor(i / 4) % 6 + 1, 100_000 + (i * 17 % 120) * 1_000, i % 9,
  ]);
  const orders = Array.from({ length: 4800 }, (_, i) => [
    i + 1, i % 11 === 0 ? 'DRAFT' : i % 5 === 0 ? 'CANCELLED' : 'CONFIRMED',
    `2026-11-${String(i % 28 + 1).padStart(2, '0')}`,
    i * 19 % 1800 + 1, i % 3 + 1, 100_000 + (i % 120) * 1_000,
  ]);
  return { products, orders };
}
const { products, orders } = seed();

const sqlQueries = {
  filter: 'SELECT id FROM qp_products WHERE category_id=2 AND brand_id=3 AND price BETWEEN 130000 AND 160000 AND stock>0 ORDER BY id',
  never_sold: `SELECT p.id FROM qp_products p WHERE NOT EXISTS
    (SELECT 1 FROM qp_lines l JOIN qp_orders o ON o.id=l.order_id
     WHERE l.product_id=p.id AND o.status IN ('CONFIRMED','CANCELLED')) ORDER BY p.id`,
  revenue: `SELECT COALESCE(SUM(l.quantity*l.unit_price),0) FROM qp_orders o
    JOIN qp_lines l ON l.order_id=o.id
    WHERE o.status='CONFIRMED' AND o.confirmed_at >= '2026-11-01' AND o.confirmed_at < '2026-11-16'`,
};
sqlQueries.filter_scan = sqlQueries.filter.replace('FROM qp_products', 'FROM qp_products IGNORE INDEX (qp_filter)');
const tuples = rows => rows.map(row => '(' + row.map(value => typeof value === 'number' ? value : "'" + value + "'").join(',') + ')').join(',');
const fixture = [
  'SELECT JSON_OBJECT("version", VERSION(), "innodb_buffer_pool_size", @@innodb_buffer_pool_size);',
  readFileSync(resolve(__dirname, 'mysql.sql'), 'utf8'),
  'INSERT INTO qp_products VALUES ' + tuples(products) + ';',
  'INSERT INTO qp_orders VALUES ' + tuples(orders.map(o => o.slice(0, 3))) + ';',
  'INSERT INTO qp_lines VALUES ' + tuples(orders.map(o => [o[0], ...o.slice(3)])) + ';',
];
for (const [name, query] of Object.entries(sqlQueries)) {
  fixture.push(`SELECT '!rows:${name}';`, query + ';');
  for (let i = 0; i < 4; i++) fixture.push(`SELECT '!plan:${name}:${i}';`, `EXPLAIN ANALYZE ${query};`);
}

const mysql = run('mysql-lab',
  'test "$MYSQL_DATABASE" = partstock_lab; test "$MYSQL_USER" = partstock_lab; export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --batch --raw --skip-column-names --user="$MYSQL_USER" "$MYSQL_DATABASE"',
  fixture.join('\n'));
const [mysqlMetadata, ...sections] = mysql.split(/^!/m);
const mysqlPlans = {};
const mysqlRows = {};
for (const section of sections) {
  const [header, ...lines] = section.trimEnd().split('\n');
  const [kind, name, iteration] = header.trim().split(':');
  if (kind === 'rows') mysqlRows[name] = lines.map(Number);
  else if (iteration !== '0') (mysqlPlans[name] ||= []).push(lines.join('\n'));
}

const mongoWorkload = readFileSync(resolve(__dirname, 'mongodb.js'), 'utf8');
const mongoScript = `try {
  ${seed.toString()}
  const runId = '${randomBytes(6).toString('hex')}';
  const { products, orders } = seed();
  ${mongoWorkload}
} catch (error) {
  console.error(error.name + ': ' + error.message);
  quit(1);
}\n`;
const mongo = JSON.parse(run('mongo-lab',
  'test "$MONGO_LAB_DATABASE" = partstock_lab; test "$MONGO_LAB_USERNAME" = partstock_lab; file=$(mktemp /tmp/partstock-qp-XXXXXX.js); trap \'rm -f "$file"\' EXIT; cat > "$file"; mongosh --quiet "mongodb://127.0.0.1:27017/$MONGO_LAB_DATABASE?directConnection=true" --authenticationDatabase "$MONGO_LAB_DATABASE" --username "$MONGO_LAB_USERNAME" --password "$MONGO_LAB_PASSWORD" --file "$file"',
  mongoScript));

const sold = new Set(orders.filter(order => order[1] !== 'DRAFT').map(order => order[3]));
const expected = {
  filter: products.filter(([, cat, brand, price, stock]) => cat === 2 && brand === 3 && price >= 130000 && price <= 160000 && stock > 0).map(p => p[0]),
  never_sold: products.filter(p => !sold.has(p[0])).map(p => p[0]),
  revenue: [orders.filter(o => o[1] === 'CONFIRMED' && o[2] < '2026-11-16').reduce((sum, o) => sum + o[4] * o[5], 0)],
};
expected.filter_scan = expected.filter;
const evidence = {};
for (const [name, rows] of Object.entries(expected)) {
  assert.deepEqual(mysqlRows[name], rows, `MySQL ${name}`);
  assert.deepEqual(mongo.queries[name].rows.map(Number), rows, `MongoDB ${name}`);
  assert.equal(mysqlPlans[name].length, 3);
  assert.equal(mongo.queries[name].samples.length, 3);
  evidence[name] = {
    count: rows.length,
    sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    ...(name === 'revenue' ? { total_vnd: rows[0] } : {}),
    mysql: mysqlPlans[name],
    mongodb: process.argv.includes('--raw') ? mongo.queries[name].samples : mongo.queries[name].samples.map(mongoMetrics),
  };
}
console.log(JSON.stringify({
  dataset: { products: products.length, orders: orders.length, linesPerOrder: 1 },
  warmup: 1, samplesPerQuery: 3, mysql: JSON.parse(mysqlMetadata),
  mongodb: { version: mongo.version, topology: mongo.topology, members: mongo.members, indexes: mongo.indexes },
  evidence,
}, null, 2));
