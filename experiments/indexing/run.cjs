const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const repo = resolve(__dirname, '../..');
const compose = ['compose', '--env-file', '.env.docker', '-f', 'compose.local.yaml'];

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
    else report[key] = lines.join('\n');
  }
  return report;
}

function main() {
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
    .replace('/* SEED */', mysqlSeed.join('\n'));
  const mysql = parseMysql(runLab('mysql-lab',
    '[ "$MYSQL_DATABASE" = partstock_lab ] && [ "$MYSQL_USER" = partstock_lab ] || exit 2; ' +
    'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --protocol=TCP -h127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE" --batch --raw --skip-column-names',
    mysqlScript,
  ));
  const mongoScript = `const runId = '${randomBytes(8).toString('hex')}';\n` +
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
    assert.equal(mongodb[key + '_before'].nReturned, expected.length);
    assert.equal(mongodb[key + '_after'].nReturned, expected.length);
  }
  console.log(JSON.stringify({ rows: documents.length, mysql, mongodb }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
