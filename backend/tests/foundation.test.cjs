const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { loadConfig } = require('../dist/config.js');
const { createApp } = require('../dist/app.js');

const valid = { APP_MYSQL_HOST: '127.0.0.1', APP_MYSQL_PORT: '3307',
  APP_MYSQL_DATABASE: 'partstock', APP_MYSQL_USER: 'partstock_app',
  APP_MYSQL_PASSWORD: 'test-only-password' };

test('config accepts app settings and keeps password intact', () => {
  const config = loadConfig({ ...valid, LAB_MYSQL_PORT: '3308' });
  assert.equal(config.db.port, 3307);
  assert.equal(config.port, 3000);
  assert.equal(config.db.password, valid.APP_MYSQL_PASSWORD);
});
test('config rejects missing credentials without printing their values', () => {
  assert.throws(() => loadConfig({ ...valid, APP_MYSQL_USER: '' }), /APP_MYSQL_USER/);
  assert.throws(() => loadConfig({ ...valid, APP_MYSQL_PASSWORD: '' }), /APP_MYSQL_PASSWORD/);
});
test('config rejects invalid ports and root/lab credentials', () => {
  for (const port of ['0', '65536', '3307abc', '3.5', '']) {
    assert.throws(() => loadConfig({ ...valid, APP_MYSQL_PORT: port }));
  }
  assert.throws(() => loadConfig({ ...valid, PORT: 'bad' }));
  assert.throws(() => loadConfig({ ...valid, APP_MYSQL_USER: 'root' }));
  assert.throws(() => loadConfig({ ...valid, APP_MYSQL_DATABASE: 'partstock_lab' }));
});

async function withApp(checkDatabase, callback) {
  const server = createApp(checkDatabase).listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
test('health works without checking database; unknown routes return JSON', async () => {
  await withApp(async () => { throw new Error('must not be called'); }, async base => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('x-powered-by'), null);
    const missing = await fetch(`${base}/missing`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  });
});
test('ready checks database and returns 200 on success', async () => {
  let calls = 0;
  await withApp(async () => { calls++; }, async base => {
    const response = await fetch(`${base}/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ready' });
    assert.equal(calls, 1);
  });
});
test('ready returns 503 without leaking database errors', async () => {
  await withApp(async () => { throw new Error('secret-password SELECT 1'); }, async base => {
    const response = await fetch(`${base}/ready`);
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.equal(JSON.parse(body).error.code, 'DATABASE_UNAVAILABLE');
    assert.doesNotMatch(body, /secret-password|SELECT/);
  });
});
