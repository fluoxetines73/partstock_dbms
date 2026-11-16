// Isolated integration check: root credentials from the LAB service only.
const mysql = require('mysql2/promise');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { randomBytes } = require('node:crypto');
const { createCatalogStore } = require('../dist/catalog.js');
const { createApp } = require('../dist/app.js');
async function main() {
  const env = process.env;
  for (const key of ['LAB_MYSQL_HOST', 'LAB_MYSQL_PORT', 'LAB_MYSQL_ROOT_PASSWORD']) {
    if (!env[key]) throw new Error(`Missing ${key}`);
  }
  assert.equal(env.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.notEqual(`${env.LAB_MYSQL_HOST}:${env.LAB_MYSQL_PORT}`, `${env.APP_MYSQL_HOST}:${env.APP_MYSQL_PORT}`);
  const schema = `partstock_uc01_test_${randomBytes(8).toString('hex')}`;
  const options = { host: env.LAB_MYSQL_HOST, port: Number(env.LAB_MYSQL_PORT), user: 'root', password: env.LAB_MYSQL_ROOT_PASSWORD, supportBigNumbers: true, bigNumberStrings: true, connectTimeout: 5000 };
  const admin = await mysql.createConnection(options);
  let pool, server, created = false;
  try {
    await admin.query(`CREATE DATABASE ${schema}`);
    created = true;
    pool = mysql.createPool({ ...options, database: schema });
    async function sqlFile(relative) {
      const sql = fs.readFileSync(path.join(__dirname, '../../database', relative), 'utf8').replace(/^--.*$/gm, '');
      const conn = await pool.getConnection();
      try { for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await conn.query(statement); }
      finally { conn.release(); }
    }
    await sqlFile('mysql/migrations/001_catalogs.sql');
    await sqlFile('mysql/migrations/002_products_suppliers.sql');
    await sqlFile('seed/001_catalogs.sql');
    const store = createCatalogStore(pool);
    assert.equal((await store.list('categories')).length, 2);
    assert.equal((await store.list('brands')).length, 2);
    for (const table of ['categories', 'brands']) {
      const item = await store.create(table, '  test  '.trim());
      assert.equal(typeof item.id, 'string');
      assert.deepEqual(await store.rename(table, item.id, 'test'), item);
      assert.equal((await store.rename(table, item.id, 'updated')).name, 'updated');
      assert.equal(await store.remove(table, item.id), true);
      assert.equal(await store.remove(table, item.id), false);
      assert.equal(await store.rename(table, item.id, 'missing'), null);
      const results = await Promise.allSettled([store.create(table, 'DUPLICATE'), store.create(table, 'duplicate')]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.code, 'ER_DUP_ENTRY');
      await store.create(table, 'Bo');
      await store.create(table, 'Bộ'); // accent-sensitive names are distinct
    }
    const cat = await store.create('categories', 'Referenced');
    const brand = await store.create('brands', 'Referenced');
    // Use B's real product migration to verify the integration boundary.
    await pool.execute('INSERT INTO products (sku, name, category_id, brand_id, selling_price) VALUES (?, ?, ?, ?, ?)', ['UC01-FK', 'UC01 fixture', cat.id, brand.id, 100000]);
    await assert.rejects(store.remove('categories', cat.id), { code: 'ER_ROW_IS_REFERENCED_2' });
    await assert.rejects(store.remove('brands', brand.id), { code: 'ER_ROW_IS_REFERENCED_2' });
    const token = randomBytes(24).toString('hex');
    server = createApp(async () => { await pool.query('SELECT 1'); }, { store, managerToken: token }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/ready`)).status, 200);
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    async function request(resource, status, method = 'GET', body) {
      const response = await fetch(`${base}/api/${resource}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      assert.equal(response.status, status, `${method} ${resource}`);
      return response.status === 204 ? null : response.json();
    }
    for (const [table, referenced] of [['categories', cat], ['brands', brand]]) {
      const item = await request(table, 201, 'POST', { name: '  UI demo  ' });
      assert.equal(item.name, 'UI demo');
      assert.equal((await request(`${table}/${item.id}`, 200, 'PATCH', { name: 'Đã đổi' })).name, 'Đã đổi');
      assert.ok((await request(table, 200)).some(row => row.id === item.id && row.name === 'Đã đổi'));
      await request(`${table}/${item.id}`, 204, 'DELETE');
      assert.equal((await request(`${table}/${item.id}`, 404, 'DELETE')).error.code, 'NOT_FOUND');
      assert.equal((await request(`${table}/${referenced.id}`, 409, 'DELETE')).error.code, 'RESOURCE_IN_USE');
      await request(`${table}/${referenced.id}`, 200, 'PATCH', { name: 'Linked renamed' });
      assert.equal((await request(table, 400, 'POST', { name: ' ' })).error.code, 'VALIDATION_ERROR');
      const race = await Promise.all(['HTTP race', 'http RACE'].map(name => fetch(`${base}/api/${table}`, {
        method: 'POST', headers, body: JSON.stringify({ name }),
      })));
      assert.deepEqual(race.map(response => response.status).sort(), [201, 409]);
      assert.equal((await fetch(`${base}/api/${table}`)).status, 401);
      assert.equal((await fetch(`${base}/api/${table}`, { headers: { authorization: 'Bearer invalid' } })).status, 403);
      const ids = (await request(table, 200)).map(item => BigInt(item.id));
      assert.deepEqual(ids, [...ids].sort((a, b) => a < b ? -1 : a > b ? 1 : 0), 'List orders numeric BIGINT IDs, including IDs >= 10');
    }
    const [linked] = await pool.query('SELECT CAST(p.category_id AS CHAR) AS category_id, CAST(p.brand_id AS CHAR) AS brand_id, c.name AS category_name, b.name AS brand_name FROM products p JOIN categories c ON c.id=p.category_id JOIN brands b ON b.id=p.brand_id WHERE p.sku="UC01-FK"');
    assert.deepEqual({ ...linked[0] }, { category_id: cat.id, brand_id: brand.id, category_name: 'Linked renamed', brand_name: 'Linked renamed' });
    console.log('PASS: real migrations 001/002, UC01 HTTP CRUD, concurrent duplicates, accents, authorization, products FK RESTRICT and rename preserving references');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    if (created) await admin.query(`DROP DATABASE ${schema}`);
    await admin.end();
  }
}
main().catch(error => { console.error('FAIL: lab integration', error instanceof assert.AssertionError ? error.message : error.code || error.name); process.exitCode = 1; });
