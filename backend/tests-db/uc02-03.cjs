const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { createApp } = require('../dist/app.js');
const { createDatabase } = require('../dist/db.js');

async function main() {
  const env = process.env;
  assert.equal(env.LAB_MYSQL_HOST, '127.0.0.1');
  assert.equal(env.LAB_MYSQL_PORT, '3308');
  assert.equal(env.LAB_MYSQL_DATABASE, 'partstock_lab');
  assert.notEqual(env.LAB_MYSQL_PORT, env.APP_MYSQL_PORT);
  assert.ok(env.LAB_MYSQL_ROOT_PASSWORD);
  assert.notEqual(env.LAB_MYSQL_ROOT_PASSWORD, env.APP_MYSQL_ROOT_PASSWORD);

  const schema = 'partstock_uc0203_test_' + randomBytes(8).toString('hex');
  const options = {
    host: env.LAB_MYSQL_HOST,
    port: Number(env.LAB_MYSQL_PORT),
    user: 'root',
    password: env.LAB_MYSQL_ROOT_PASSWORD,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectTimeout: 5000,
  };
  const admin = await mysql.createConnection({ ...options, multipleStatements: true });
  let created = false;
  let database;
  let server;
  try {
    await admin.query(`CREATE DATABASE ${schema}`);
    created = true;
    await admin.query(`USE ${schema}`);
    for (const file of [
      'mysql/migrations/001_catalogs.sql',
      'mysql/migrations/002_products_suppliers.sql',
      'seed/001_catalogs.sql',
      'seed/002_products_suppliers.sql',
    ]) {
      await admin.query(readFileSync(resolve(__dirname, '../../database', file), 'utf8'));
    }

    database = createDatabase({ ...options, database: schema });
    const token = randomBytes(24).toString('hex');
    server = createApp(database.check, {
      store: database.catalog, products: database.products, suppliers: database.suppliers, managerToken: token,
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    const productsResponse = await fetch(base + '/products', { headers });
    assert.equal(productsResponse.status, 200);
    const products = await productsResponse.json();
    assert.equal(products.length, 5);
    assert.equal(products.find(product => product.sku === 'SSD-SAM-500').status, 'DISCONTINUED');
    assert.ok(products.every(product => [product.id, product.category_id, product.brand_id].every(id => typeof id === 'string')));
    const suppliersResponse = await fetch(base + '/suppliers', { headers });
    assert.equal(suppliersResponse.status, 200);
    const suppliers = await suppliersResponse.json();
    assert.equal(suppliers.length, 2);
    assert.ok(suppliers.every(supplier => typeof supplier.id === 'string'));
    console.log('PASS: GET returned 5 products and 2 suppliers from the MySQL lab seed.');

    async function request(path, status, method = 'GET', body) {
      const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
      const result = await response.json();
      assert.equal(response.status, status, `${method} ${path}: ${result.error?.code ?? ''}`);
      return result;
    }

    const seedProduct = products.find(product => product.sku === 'RAM-KIN-08');
    const productInput = {
      sku: 'RAM-TEST-01', name: 'RAM kiểm thử', category_id: seedProduct.category_id,
      brand_id: seedProduct.brand_id, selling_price: 450000, specifications: { capacity_gb: 8 },
    };
    const product = await request('/products', 201, 'POST', productInput);
    assert.match(product.id, /^[1-9]\d*$/);
    assert.deepEqual(product, { id: product.id, status: 'ACTIVE', ...productInput });
    const productPath = '/products/' + product.id;
    const updatedProduct = await request(productPath, 200, 'PATCH', { selling_price: 470000 });
    assert.deepEqual(updatedProduct, { ...product, selling_price: 470000 });
    assert.deepEqual(await request(productPath, 200, 'PATCH', { selling_price: 470000 }), updatedProduct);
    assert.deepEqual(
      await request(productPath, 200, 'PATCH', { specifications: null }),
      { ...updatedProduct, specifications: null },
    );
    console.log('PASS: product create and partial update, unchanged PATCH, and clearing specifications.');

    const supplier = await request('/suppliers', 201, 'POST', { name: '  Nhà cung cấp kiểm thử  ' });
    assert.match(supplier.id, /^[1-9]\d*$/);
    assert.deepEqual(supplier, { id: supplier.id, name: 'Nhà cung cấp kiểm thử', phone: null, email: null });
    const supplierPath = '/suppliers/' + supplier.id;
    const updatedSupplier = await request(supplierPath, 200, 'PATCH', { phone: '0900000000', email: 'test@example.invalid' });
    assert.deepEqual(updatedSupplier, { ...supplier, phone: '0900000000', email: 'test@example.invalid' });
    assert.deepEqual(
      await request(supplierPath, 200, 'PATCH', { email: null }),
      { ...updatedSupplier, email: null },
    );
    console.log('PASS: supplier create with optional contacts and partial update.');

    for (const invalid of [
      { selling_price: -1 }, { selling_price: 1.5 }, { selling_price: 1_000_000_000_000_000 },
      { brand_id: null }, { category_id: 1 }, { specifications: [] }, { sku: ' ' }, { name: ' ' },
    ]) {
      assert.equal((await request('/products', 400, 'POST', { ...productInput, ...invalid })).error.code, 'VALIDATION_ERROR');
    }
    const { brand_id: _brandId, ...withoutBrand } = productInput;
    assert.equal((await request('/products', 400, 'POST', withoutBrand)).error.code, 'VALIDATION_ERROR');
    for (const field of ['category_id', 'brand_id']) {
      const unknownReference = { [field]: '18446744073709551615' };
      assert.equal((await request('/products', 400, 'POST', {
        ...productInput, sku: 'RAM-TEST-BAD-FK', ...unknownReference,
      })).error.code, 'INVALID_REFERENCE');
      assert.equal((await request(productPath, 400, 'PATCH', {
        ...unknownReference, selling_price: 123456,
      })).error.code, 'INVALID_REFERENCE');
    }
    assert.equal((await request('/products', 409, 'POST', { ...productInput, sku: product.sku.toLowerCase() })).error.code, 'SKU_CONFLICT');
    assert.equal((await request(productPath, 409, 'PATCH', { sku: seedProduct.sku })).error.code, 'SKU_CONFLICT');
    assert.equal((await request(productPath, 400, 'PATCH', {})).error.code, 'VALIDATION_ERROR');
    assert.equal((await request(productPath, 400, 'PATCH', { status: 'DISCONTINUED' })).error.code, 'VALIDATION_ERROR');
    assert.equal((await request('/products/18446744073709551615', 404, 'PATCH', { selling_price: 1 })).error.code, 'NOT_FOUND');
    assert.equal((await request('/suppliers', 400, 'POST', { phone: '0900000000' })).error.code, 'VALIDATION_ERROR');
    assert.equal((await request(supplierPath, 400, 'PATCH', { phone: 900000000 })).error.code, 'VALIDATION_ERROR');
    assert.equal((await request('/suppliers/18446744073709551615', 404, 'PATCH', { name: 'Unknown' })).error.code, 'NOT_FOUND');
    for (const path of ['/products', '/suppliers']) {
      const unauthorized = await fetch(base + path);
      assert.equal(unauthorized.status, 401);
      assert.equal((await unauthorized.json()).error.code, 'UNAUTHENTICATED');
    }
    for (const path of ['/categories/' + seedProduct.category_id, '/brands/' + seedProduct.brand_id]) {
      assert.equal((await request(path, 409, 'DELETE')).error.code, 'RESOURCE_IN_USE');
    }
    assert.deepEqual(await request('/products', 200), [...products, { ...updatedProduct, specifications: null }]);
    assert.deepEqual(await request('/suppliers', 200), [...suppliers, { ...updatedSupplier, email: null }]);
    console.log('PASS: validation, foreign keys (including UC01 RESTRICT), SKU conflict, missing records, authentication and unchanged data after rejected writes.');
  } finally {
    try {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    } finally {
      try {
        if (database) await database.close();
      } finally {
        try {
          if (created) await admin.query(`DROP DATABASE ${schema}`);
        } finally {
          await admin.end();
        }
      }
    }
  }
}

main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : error.code || error.name);
  process.exitCode = 1;
});
