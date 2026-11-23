// Browser test fixture: exclusively a fresh schema on the local LAB service.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { createDatabase } = require('../dist/db.js');
const { createApp } = require('../dist/app.js');
const { applyMigrations } = require('../scripts/setup-catalog.cjs');

async function main() {
  const env = process.env;
  assert.equal(env.LAB_MYSQL_HOST, '127.0.0.1');
  assert.equal(env.LAB_MYSQL_PORT, '3308');
  assert.equal(env.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.notEqual(env.LAB_MYSQL_PORT, env.APP_MYSQL_PORT);
  assert.ok(env.LAB_MYSQL_ROOT_PASSWORD);
  assert.notEqual(env.LAB_MYSQL_ROOT_PASSWORD, env.APP_MYSQL_ROOT_PASSWORD);
  assert.ok(env.E2E_MANAGER_TOKEN);
  const schema = `partstock_uc01_ui_${randomBytes(8).toString('hex')}`;
  const options = { host: env.LAB_MYSQL_HOST, port: Number(env.LAB_MYSQL_PORT), user: 'root', password: env.LAB_MYSQL_ROOT_PASSWORD, supportBigNumbers: true, bigNumberStrings: true };
  const admin = await mysql.createConnection({ ...options, multipleStatements: true });
  let database, server, created = false, stopping = false;
  async function cleanup() {
    if (stopping) return;
    stopping = true;
    try { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }
    finally {
      try { if (database) await database.close(); }
      finally { try { if (created) await admin.query(`DROP DATABASE ${schema}`); } finally { await admin.end(); } }
    }
  }
  try {
    await admin.query(`CREATE DATABASE ${schema}`); created = true;
    await admin.query(`USE ${schema}`);
    await applyMigrations(admin);
    for (const file of ['001_catalogs.sql', '002_products_suppliers.sql', '003_inventory_documents.sql']) {
      await admin.query(readFileSync(resolve(__dirname, '../../database/seed', file), 'utf8'));
    }
    database = createDatabase({ ...options, database: schema });
    server = createApp(database.check, {
      store: database.catalog, queries: database.queries, products: database.products,
      suppliers: database.suppliers, purchases: database.purchases, sales: database.sales,
      managerToken: env.E2E_MANAGER_TOKEN, staffToken: env.E2E_STAFF_TOKEN,
    }).listen(3101, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { cleanup().catch(() => { process.exitCode = 1; }); });
  } catch (error) { await cleanup(); throw error; }
}
main().catch(error => { console.error('UI lab fixture failed:', error.code || error.name); process.exitCode = 1; });
