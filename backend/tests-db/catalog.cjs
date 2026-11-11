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
    // Test fixture only; not the products schema owned by B.
    await pool.query('CREATE TABLE product_reference_fixture (category_id BIGINT UNSIGNED, brand_id BIGINT UNSIGNED, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT, FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT) ENGINE=InnoDB');
    await pool.execute('INSERT INTO product_reference_fixture VALUES (?, ?)', [cat.id, brand.id]);
    await assert.rejects(store.remove('categories', cat.id), { code: 'ER_ROW_IS_REFERENCED_2' });
    await assert.rejects(store.remove('brands', brand.id), { code: 'ER_ROW_IS_REFERENCED_2' });
    const token = randomBytes(24).toString('hex');
    server = createApp(async () => { await pool.query('SELECT 1'); }, { store, managerToken: token }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/ready`)).status, 200);
    const response = await fetch(`${base}/api/categories/${cat.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 409);
    console.log('PASS: lab migration/seed, CRUD, concurrent duplicates, accents, FK restriction and HTTP with real MySQL');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    if (created) await admin.query(`DROP DATABASE ${schema}`);
    await admin.end();
  }
}
main().catch(error => { console.error('FAIL: lab integration', error.code || error.name); process.exitCode = 1; });
