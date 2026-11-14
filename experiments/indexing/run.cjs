const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const repo = resolve(__dirname, '../..');
const compose = ['compose', '--env-file', '.env.docker', '-f', 'compose.local.yaml'];
const sampleCount = 5;
const updateRowCount = 1000;
const priceStep = 1000;
const mysqlLabGuard = '[ "$MYSQL_DATABASE" = partstock_lab ] && [ "$MYSQL_USER" = partstock_lab ] || exit 2; ';
const mysqlClient = 'mysql --protocol=TCP -h127.0.0.1 --batch --raw --skip-column-names';
const mysqlFilters = {
  sku: "sku = 'IDX-0004201'",
  brand_price: 'brand_id = 7 AND selling_price BETWEEN 500000 AND 520000',
};

function runLab(service, command, input) {
  const result = spawnSync('docker', [...compose, 'exec', '-T', service, 'sh', '-ec', command], {
    cwd: repo, input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${service} exited with status ${result.status}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function parseMysql(output) {
  const [metadata, ...sections] = output.split(/^::/m);
  const report = JSON.parse(metadata);
  for (const section of sections) {
    const [key, ...lines] = section.trimEnd().split(/\r?\n/);
    if (key.endsWith('_result')) report[key] = lines.map(line => JSON.parse(line));
    else if (key === 'rows') report.rows = Number(lines[0]);
    else if (key.startsWith('index_size_') || key.startsWith('update_cost_')) {
      report[key] = lines.map(line => JSON.parse(line));
    }
    else if (/^(sku|brand_price)_(before|after)$/.test(key)) {
      const root = lines[0]?.match(/\(actual time=[\d.]+\.\.([\d.]+) rows=([\d.]+) loops=1\)/);
      assert.ok(root, `Cannot read MySQL root iterator statistics for ${key}`);
      (report[key] ??= []).push({
        completionTimeMs: Number(root[1]),
        nReturned: Number(root[2]),
        plan: lines.join('\n'),
      });
    }
    else report[key] = lines.join('\n');
  }
  return report;
}

function mysqlExplains(phase) {
  return Object.entries(mysqlFilters).map(([query, filter]) => `
SELECT '::${query}_${phase}';
EXPLAIN ANALYZE FORMAT=TREE SELECT sku, name, brand_id, selling_price
FROM indexing_products WHERE ${filter};
`.repeat(1 + sampleCount)).join('\n');
}

function summarize(samples, expectedRows, timingField) {
  assert.equal(samples.length, sampleCount);
  for (const sample of samples) assert.equal(sample.nReturned, expectedRows);
  const times = samples.map(sample => sample[timingField]);
  assert.ok(times.every(Number.isFinite));
  const sorted = [...times].sort((a, b) => a - b);
  return { medianMs: sorted[Math.floor(sorted.length / 2)], samples };
}

function mysqlIndexSizes(phase) {
  return `
SELECT '::analyze_${phase}';
ANALYZE TABLE indexing_products;
SELECT '::index_size_${phase}';
SELECT JSON_OBJECT('index', index_name, 'pages', stat_value,
                   'pageSizeBytes', @@innodb_page_size,
                   'sizeBytes', stat_value * @@innodb_page_size)
FROM mysql.innodb_index_stats
WHERE database_name = DATABASE()
  AND table_name = 'indexing_products' AND stat_name = 'size'
ORDER BY index_name;
`;
}

function mysqlSchemaCommand(schema) {
  // The schema name is generated locally, and cleanup is registered only after creation succeeds.
  return mysqlLabGuard +
    'export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:?Missing MySQL lab root password}"; ' +
    `${mysqlClient} -uroot -e 'CREATE DATABASE ${schema}'; ` +
    `trap "${mysqlClient} -uroot -e 'DROP DATABASE ${schema}'" EXIT; ` +
    `${mysqlClient} -uroot ${schema}`;
}

function mysqlUpdates(phase) {
  return `
SET SESSION autocommit = 1;
SELECT '::update_cost_${phase}';
` + `
SET @started = SYSDATE(6);
UPDATE indexing_products FORCE INDEX (PRIMARY)
SET selling_price = selling_price + ${priceStep}
WHERE id BETWEEN 1 AND ${updateRowCount};
SET @modified = ROW_COUNT(), @finished = SYSDATE(6);
UPDATE indexing_products FORCE INDEX (PRIMARY)
SET selling_price = selling_price - ${priceStep}
WHERE id BETWEEN 1 AND ${updateRowCount};
SET @reset = ROW_COUNT();
SELECT JSON_OBJECT('elapsedMs', TIMESTAMPDIFF(MICROSECOND, @started, @finished) / 1000.0,
                   'modified', @modified, 'reset', @reset, 'baselineMatches',
                   (SELECT COUNT(*) FROM indexing_products
                    WHERE id BETWEEN 1 AND ${updateRowCount}
                      AND selling_price = 100000 + ((id - 1) DIV 20) * 2000));
`.repeat(1 + sampleCount);
}

function summarizeUpdates(runs) {
  assert.equal(runs.length, 1 + sampleCount);
  for (const { elapsedMs, modified, reset, baselineMatches } of runs) {
    assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= 0);
    assert.equal(modified, updateRowCount);
    assert.equal(reset, updateRowCount);
    assert.equal(baselineMatches, updateRowCount);
  }
  const [warmup, ...samples] = runs;
  const times = samples.map(sample => sample.elapsedMs).sort((a, b) => a - b);
  return { warmup, samples, medianMs: times[Math.floor(times.length / 2)] };
}

function checkIndexSizes(mysql, mongodb) {
  for (const phase of ['before', 'after']) {
    const secondary = phase === 'after' ? ['idx_brand_price', 'idx_sku'] : [];
    const key = 'index_size_' + phase;
    const mysqlSizes = mysql[key];
    assert.deepEqual(mysqlSizes.map(row => row.index).sort(), ['PRIMARY', ...secondary].sort());
    for (const { pages, pageSizeBytes, sizeBytes } of mysqlSizes) {
      assert.ok(Number.isSafeInteger(pages) && pages > 0 && pageSizeBytes > 0);
      assert.equal(sizeBytes, pages * pageSizeBytes);
    }
    const { indexSizes, totalIndexSize, scaleFactor } = mongodb[key];
    assert.equal(scaleFactor, 1);
    assert.deepEqual(Object.keys(indexSizes).sort(), ['_id_', ...secondary].sort());
    const sizes = Object.values(indexSizes);
    assert.ok(sizes.every(size => Number.isSafeInteger(size) && size > 0));
    assert.equal(totalIndexSize, sizes.reduce((total, size) => total + size, 0));
  }
}

function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && ['--index-size', '--update-cost'].includes(args[0])),
    'Usage: node experiments/indexing/run.cjs [--index-size | --update-cost]');
  const measureIndexSize = args[0] === '--index-size';
  const measureUpdateCost = args[0] === '--update-cost';
  const measureQueries = !measureIndexSize && !measureUpdateCost;
  const runId = randomBytes(8).toString('hex');
  const documents = Array.from({ length: 10_000 }, (_, offset) => {
    const id = offset + 1;
    return {
      _id: id,
      sku: 'IDX-' + String(id).padStart(7, '0'),
      name: 'Part ' + id,
      brand_id: offset % 20 + 1,
      selling_price: 100_000 + Math.floor(offset / 20) * 2_000,
    };
  });
  const mysqlSeed = [];
  for (let start = 0; start < documents.length; start += 500) {
    // Only the generated numeric values and fixed ASCII labels above enter this SQL.
    const values = documents.slice(start, start + 500).map(
      row => `(${row._id}, '${row.sku}', '${row.name}', ${row.brand_id}, ${row.selling_price})`,
    );
    mysqlSeed.push('INSERT INTO indexing_products VALUES\n' + values.join(',\n') + ';');
  }
  const mysqlScript = readFileSync(resolve(__dirname, 'mysql.sql'), 'utf8')
    .replace('/* TABLE_SCOPE */', measureQueries ? 'TEMPORARY' : '')
    .replace('/* TABLE_OPTIONS */', measureIndexSize ? 'STATS_PERSISTENT=1' : '')
    .replace('/* SEED */', mysqlSeed.join('\n'))
    .replace('/* EXPLAIN BEFORE */', measureQueries ? mysqlExplains('before') : '')
    .replace('/* EXPLAIN AFTER */', measureQueries ? mysqlExplains('after') : '')
    .replace('/* SIZE BEFORE */', measureIndexSize ? mysqlIndexSizes('before') : '')
    .replace('/* SIZE AFTER */', measureIndexSize ? mysqlIndexSizes('after') : '')
    .replace('/* UPDATE BEFORE */', measureUpdateCost ? mysqlUpdates('before') : '')
    .replace('/* UPDATE AFTER */', measureUpdateCost ? mysqlUpdates('after') : '');
  const mysqlCommand = measureQueries
    ? mysqlLabGuard + `export MYSQL_PWD="$MYSQL_PASSWORD"; exec ${mysqlClient} -u"$MYSQL_USER" "$MYSQL_DATABASE"`
    : mysqlSchemaCommand(`partstock_idx_${measureIndexSize ? 'size' : 'update'}_${runId}`);
  const mysql = parseMysql(runLab('mysql-lab', mysqlCommand, mysqlScript));
  const mongoScript = `const runId = '${runId}';\n` +
    `const sampleCount = ${sampleCount};\n` +
    `const measureIndexSize = ${measureIndexSize};\n` +
    `const measureUpdateCost = ${measureUpdateCost};\n` +
    `const updateRowCount = ${updateRowCount};\n` +
    `const priceStep = ${priceStep};\n` +
    `const documents = ${JSON.stringify(documents)};\n` +
    readFileSync(resolve(__dirname, 'mongodb.js'), 'utf8');
  const mongodb = JSON.parse(runLab('mongo-lab',
    '[ "$MONGO_LAB_DATABASE" = partstock_lab ] && [ "$MONGO_LAB_USERNAME" = partstock_lab ] || exit 2; ' +
    'exec mongosh --quiet "mongodb://127.0.0.1:27017/partstock_lab?replicaSet=rs0&directConnection=true" ' +
    '--username "$MONGO_LAB_USERNAME" --password "$MONGO_LAB_PASSWORD" --authenticationDatabase partstock_lab --file /dev/stdin',
    mongoScript,
  ));

  assert.equal(mysql.rows, documents.length);
  assert.equal(mongodb.rows, documents.length);
  for (const [key, predicate] of [
    ['sku', row => row.sku === 'IDX-0004201'],
    ['brand_price', row => row.brand_id === 7 && row.selling_price >= 500_000 && row.selling_price <= 520_000],
  ]) {
    const expected = documents.filter(predicate).map(row => [row.sku, row.name, row.brand_id, row.selling_price]);
    assert.deepEqual(mysql[key + '_result'], expected);
    assert.deepEqual(mongodb[key + '_result'], expected);
    if (!measureQueries) continue;
    for (const phase of ['before', 'after']) {
      const caseName = key + '_' + phase;
      // MySQL's first plan is the warm-up. MongoDB discards its warm-up in mongosh.
      mysql[caseName] = summarize(mysql[caseName].slice(1), expected.length, 'completionTimeMs');
      mongodb[caseName] = summarize(mongodb[caseName], expected.length, 'executionTimeMillis');
    }
  }
  if (measureIndexSize) {
    checkIndexSizes(mysql, mongodb);
    console.log(JSON.stringify({ rows: documents.length, mysql, mongodb }, null, 2));
    return;
  }
  if (measureUpdateCost) {
    for (const key of ['update_cost_before', 'update_cost_after']) {
      mysql[key] = summarizeUpdates(mysql[key]);
      mongodb[key] = summarizeUpdates(mongodb[key]);
    }
  }
  console.log(JSON.stringify({
    rows: documents.length, warmupRuns: 1, measuredRuns: sampleCount, cacheFlushed: false,
    ...(measureUpdateCost && { updateRowCount, priceStepVnd: priceStep }),
    mysql, mongodb,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
