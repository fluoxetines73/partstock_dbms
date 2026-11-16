const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const repo = resolve(__dirname, '../..');
const compose = ['compose', '--env-file', '.env.docker', '-f', 'compose.local.yaml'];
function run(service, command, input) {
  const result = spawnSync('docker', [...compose, 'exec', '-T', service, 'sh', '-ec', command], {
    cwd: repo, input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000,
  });
  if (result.error || result.status !== 0) throw new Error(`${service}: lab command failed (${result.error?.code ?? result.status}); check lab health/credentials`);
  return result.stdout;
}
const documents = Array.from({ length: 5000 }, (_, i) => ({
  _id: i + 1, sku: `ST-${String(i + 1).padStart(6, '0')}`, name: `Part ${i + 1}`,
  selling_price: 100000 + (i + 1) * 10,
  specifications: { description: createHash('sha256').update(String(i + 1)).digest('hex').slice(0, 32) },
}));
function inserts(start, end) {
  const chunks = [];
  for (let i = start; i < end; i += 500) {
    const batch = documents.slice(i, Math.min(i + 500, end));
    // Values are generated ASCII labels, hashes and integers; no external input enters SQL.
    chunks.push('INSERT INTO storage_products VALUES ' + batch.map(d => `(${d._id},'${d.sku}','${d.name}',${d.selling_price})`).join(',') + ';');
    chunks.push('INSERT INTO storage_specifications VALUES ' + batch.map(d => `(${d._id},'${d.specifications.description}')`).join(',') + ';');
  }
  return chunks.join('\n');
}
function snapshot(phase, expanded = false) {
  return `
SET SESSION information_schema_stats_expiry=0;
ANALYZE TABLE storage_products, storage_specifications;
SELECT JSON_OBJECT('phase','${phase}', 'logical', JSON_OBJECT(
 'count',(SELECT COUNT(*) FROM storage_products),
 'specCount',(SELECT COUNT(*) FROM storage_specifications),
 'idSum',(SELECT COALESCE(SUM(id),0) FROM storage_products),
 'priceSum',(SELECT COALESCE(SUM(selling_price),0) FROM storage_products),
 'payloadBytes',(SELECT COALESCE(SUM(OCTET_LENGTH(description)),0) FROM storage_specifications),
 'invalid',(SELECT COUNT(*) FROM storage_products p JOIN storage_specifications s ON p.id=s.product_id
   WHERE p.sku<>CONCAT('ST-',LPAD(p.id,6,'0')) OR p.name<>CONCAT('Part ',p.id)
   OR p.selling_price<>100000+p.id*10 OR BINARY s.description<>BINARY REPEAT(LEFT(SHA2(CAST(p.id AS CHAR),256),32),${expanded ? 16 : 1}))),
 'tables',(SELECT JSON_ARRAYAGG(JSON_OBJECT('name',TABLE_NAME,'engine',ENGINE,'rowFormat',ROW_FORMAT,
 'estimatedRows',TABLE_ROWS,'dataLength',DATA_LENGTH,'indexLength',INDEX_LENGTH,'dataFree',DATA_FREE))
 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()));`;
}
function expected(phase) {
  let rows = phase === 'empty' ? [] : phase === '1000' ? documents.slice(0,1000) : documents;
  if (phase === 'deleted_half') rows = rows.filter(d => d._id % 2 === 1);
  return { count: rows.length, idSum: rows.reduce((s,d)=>s+d._id,0),
    priceSum: rows.reduce((s,d)=>s+d.selling_price,0),
    payloadBytes: rows.length * (['expanded','deleted_half'].includes(phase) ? 512 : 32), invalid: 0 };
}
function main() {
  const id = randomBytes(8).toString('hex');
  const schema = `partstock_storage_${id}`;
  const client = 'mysql --batch --raw --skip-column-names -uroot';
  const mysqlScript = `SELECT JSON_OBJECT('metadata',JSON_OBJECT('version',VERSION(),'engine','InnoDB',
    'pageSize',@@innodb_page_size,'filePerTable',@@innodb_file_per_table,
    'bufferPoolSize',@@innodb_buffer_pool_size));\n` +
    readFileSync(resolve(repo, 'database/lab/storage/mysql.sql'),'utf8') + snapshot('empty') +
    inserts(0,1000) + snapshot('1000') + inserts(1000,5000) + snapshot('5000') +
    'UPDATE storage_specifications SET description=REPEAT(description,16);' + snapshot('expanded',true) +
    'DELETE FROM storage_products WHERE MOD(id,2)=0;' + snapshot('deleted_half',true);
  const mysqlOutput = run('mysql-lab',
    '[ "$MYSQL_DATABASE" = partstock_lab ] && [ "$MYSQL_USER" = partstock_lab ] || exit 2; ' +
    'export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:?Missing lab password}"; ' +
    `${client} -e 'CREATE DATABASE ${schema}'; ` +
    `trap "${client} -e 'DROP DATABASE ${schema}'" EXIT; ${client} ${schema}`, mysqlScript);
  const parsed = mysqlOutput.split(/\r?\n/).filter(line=>line.startsWith('{')).map(line=>JSON.parse(line));
  assert.equal(parsed.length,6);
  const mysql = { ...parsed[0].metadata, phases: parsed.slice(1) };
  const mongoScript = `const collectionName='storage_${id}'; const documents=${JSON.stringify(documents)};\n` +
    readFileSync(resolve(repo,'database/lab/storage/mongodb.js'),'utf8');
  const mongodb = JSON.parse(run('mongo-lab',
    '[ "$MONGO_LAB_DATABASE" = partstock_lab ] && [ "$MONGO_LAB_USERNAME" = partstock_lab ] || exit 2; ' +
    'exec mongosh --quiet "mongodb://127.0.0.1:27017/partstock_lab?replicaSet=rs0&directConnection=true" ' +
    '--username "${MONGO_INITDB_ROOT_USERNAME:?Missing lab admin}" --password "${MONGO_INITDB_ROOT_PASSWORD:?Missing lab password}" --authenticationDatabase admin --file /dev/stdin', mongoScript));
  const phases = ['empty','1000','5000','expanded','deleted_half'];
  for (const system of [mysql,mongodb]) {
    assert.deepEqual(system.phases.map(p=>p.phase),phases);
    for (const p of system.phases) {
      const { specCount, ...logical } = p.logical;
      assert.deepEqual(logical,expected(p.phase));
      if (specCount !== undefined) assert.equal(specCount,logical.count);
    }
  }
  console.log(JSON.stringify({ capturedAt:new Date().toISOString(), seed:'sha256(id), ASCII payload',
    measuredRuns:1, timingMeasured:false, mongoFsyncBeforeStats:true,
    models:{ mysql:'products + one specification row per product', mongodb:'product with embedded specification' },
    mysql,mongodb, validation:'PASS: exact counts, ID/price totals and all fixture values at five phases' },null,2));
}
try { main(); } catch(error) { console.error(error.message); process.exitCode=1; }
