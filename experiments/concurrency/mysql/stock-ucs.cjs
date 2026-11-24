'use strict';
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { demoSku, runStockCases } = require('../stock-ucs/cases.js');
const { stockOperations } = require('./stock-operations.cjs');

async function runMysql(root, checks) {
  const e = process.env;
  assert.equal(e.LAB_MYSQL_HOST, '127.0.0.1');
  assert.equal(e.LAB_MYSQL_PORT, '3308');
  assert.equal(e.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.equal(e.LAB_MYSQL_USER, 'partstock_lab');
  assert.ok(e.APP_MYSQL_PORT && e.LAB_MYSQL_PORT !== e.APP_MYSQL_PORT);
  assert.ok(e.LAB_MYSQL_ROOT_PASSWORD && e.LAB_MYSQL_ROOT_PASSWORD !== e.APP_MYSQL_ROOT_PASSWORD);
  const backend = createRequire(path.join(root,'backend/package.json'));
  const mysql = backend('mysql2/promise');
  const { createDatabase } = backend('./dist/db.js');
  const { VN_NOW, inTransaction } = backend('./dist/documents.js');
  const { applyMigrations } = backend('./scripts/setup-catalog.cjs');
  const options = { host: e.LAB_MYSQL_HOST, port: Number(e.LAB_MYSQL_PORT), user: 'root', password: e.LAB_MYSQL_ROOT_PASSWORD,
    connectTimeout: 5000, supportBigNumbers: true, bigNumberStrings: true };
  const schema = 'partstock_e_' + randomBytes(10).toString('hex');
  const admin = await mysql.createConnection({ ...options, multipleStatements: true });
  let owned = false, pool, app;
  try {
    const [[account]] = await admin.query("SELECT COUNT(*) AS n FROM mysql.user WHERE User='partstock_lab'");
    assert.ok(Number(account.n) > 0, 'Missing dedicated lab account');
    await admin.query('CREATE DATABASE ' + schema);
    owned = true;
    await admin.query('USE ' + schema);
    await applyMigrations(admin);
    for (const name of ['001_catalogs','002_products_suppliers','003_inventory_documents']) {
      await admin.query(readFileSync(path.join(root,'database/seed',name+'.sql'),'utf8'));
    }
    await admin.query(readFileSync(path.join(__dirname,'stock-ucs-schema.sql'),'utf8'));
    const [[meta]] = await admin.query("SELECT VERSION() AS version, @@transaction_isolation AS default_isolation, (SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='inventory') AS engine");
    assert.equal(meta.engine, 'InnoDB');
    pool = mysql.createPool({ ...options, database: schema, connectionLimit: 6 });
    app = createDatabase({ ...options, database: schema, connectionLimit: 5 });
    const conn = c => ({
      rows: async (sql,args=[]) => (await c.query(sql,args))[0],
      change: async (sql,args=[]) => (await c.query(sql,args))[0].affectedRows,
    });
    const context = {
      lock: ' FOR UPDATE', now: VN_NOW,
      write: fn => inTransaction(pool, c => fn(conn(c))),
      async read(fn) {
        const c = await pool.getConnection();
        try {
          await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
          await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
          const result = await fn(conn(c));
          await c.commit();
          return result;
        } catch (error) { await c.rollback(); throw error; }
        finally { c.release(); }
      },
    };
    let product;
    const ops = Object.assign(stockOperations(context), {
      async newProduct() {
        const [[p]] = await admin.query("SELECT category_id,brand_id FROM products WHERE sku='RAM-KIN-08'");
        product = await app.products.create({ sku:demoSku,name:'E concurrency demo',category_id:String(p.category_id),
          brand_id:String(p.brand_id),selling_price:1000 });
      },
      async receive(n) {
        const [[s]] = await admin.query("SELECT id FROM suppliers WHERE name='Nha cung cap mau A'");
        const receipt = await app.purchases.create({ supplier_id:String(s.id),note:null,
          lines:[{product_id:product.id,quantity:n,unit_cost:100}] });
        return app.purchases.confirm(receipt.id);
      },
      draftSale: n => app.sales.create({ customer_name:null,note:null,lines:[{product_id:product.id,quantity:n}] }),
      async confirmSale(order) {
        try { return (await app.sales.confirm(order.id)).status; }
        catch (err) { if (err.code === 'INSUFFICIENT_STOCK') return err.code; throw err; }
      },
      cancel: order => app.sales.cancel(order.id,'Huy trong lab E'),
      saleState: async order => (await app.sales.get(order.id)).status,
    });
    await runStockCases(ops,checks);
    return { ...meta, reader:'REPEATABLE READ, consistent snapshot', schema, writers:'UC02/04/07/08 application stores' };
  } finally {
    try {
      if (app) await app.close();
      if (pool) await pool.end();
      if (owned) await admin.query('DROP DATABASE ' + schema);
    } finally { await admin.end(); }
  }
}
module.exports = { runMysql };
