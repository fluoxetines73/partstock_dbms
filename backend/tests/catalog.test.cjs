const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../dist/app.js');

async function run(store, token, action) {
  const server = createApp(async () => {}, { store, managerToken: token }).listen(0, '127.0.0.1');
  try { await once(server, 'listening'); await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const headers = { authorization: 'Bearer test-manager-token', 'content-type': 'application/json' };
for (const resource of ['categories', 'brands']) {
  test(`${resource}: CRUD and trimmed names`, async () => {
    const rows = [];
    const store = {
      async list(table) { assert.equal(table, resource); return rows; },
      async create(table, name) { assert.equal(table, resource); const row = { id: '1', name }; rows.push(row); return row; },
      async rename(table, id, name) { assert.equal(table, resource); assert.equal(id, '1'); rows[0].name = name; return rows[0]; },
      async remove(table, id) { assert.equal(table, resource); assert.equal(id, '1'); rows.pop(); return true; }
    };
    await run(store, 'test-manager-token', async base => {
      const url = `${base}/api/${resource}`;
      let response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ name: ' RAM ' }) });
      assert.equal(response.status, 201); assert.deepEqual(await response.json(), { id: '1', name: 'RAM' });
      assert.deepEqual(await (await fetch(url, { headers })).json(), [{ id: '1', name: 'RAM' }]);
      response = await fetch(`${url}/1`, { method: 'PATCH', headers, body: JSON.stringify({ name: 'SSD' }) });
      assert.equal(response.status, 200); assert.equal((await response.json()).name, 'SSD');
      assert.equal((await fetch(`${url}/1`, { method: 'DELETE', headers })).status, 204);
    });
  });
}
test('missing token config or credentials never calls store', async () => {
  const store = { async list() { assert.fail('unauthorized DB access'); } };
  await run(store, undefined, async base => assert.equal((await fetch(`${base}/api/categories`)).status, 503));
  await run(store, 'test-manager-token', async base => {
    assert.equal((await fetch(`${base}/api/categories`)).status, 401);
    assert.equal((await fetch(`${base}/api/categories`, { headers: { authorization: 'Bearer wrong' } })).status, 403);
  });
});
test('invalid payload, JSON, id and content type never reach store', async () => {
  await run({}, 'test-manager-token', async base => {
    for (const body of [{ name: '' }, { name: '  ' }, { name: 3 }, { name: 'x'.repeat(101) }, { name: 'x', id: '1' }, null]) {
      assert.equal((await fetch(`${base}/api/categories`, { method: 'POST', headers, body: JSON.stringify(body) })).status, 400);
    }
    assert.equal((await fetch(`${base}/api/categories`, { method: 'POST', headers, body: '{' })).status, 400);
    assert.equal((await fetch(`${base}/api/categories/1abc`, { method: 'DELETE', headers })).status, 400);
    assert.equal((await fetch(`${base}/api/categories`, { method: 'POST', headers: { authorization: headers.authorization }, body: 'name=RAM' })).status, 415);
  });
});
test('duplicate and FK conflicts return 409; missing records return 404; SQL errors stay private', async () => {
  let code = 'ER_DUP_ENTRY';
  await run({
    async create() { throw Object.assign(new Error('secret SQL'), { code }); },
    async remove() { throw Object.assign(new Error('secret SQL'), { code: 'ER_ROW_IS_REFERENCED_2' }); },
    async rename() { return null; }
  }, 'test-manager-token', async base => {
    const url = `${base}/api/categories`;
    let response = await fetch(url, { method: 'POST', headers, body: '{"name":"RAM"}' });
    assert.equal(response.status, 409); assert.equal((await response.json()).error.code, 'NAME_CONFLICT');
    response = await fetch(`${url}/1`, { method: 'DELETE', headers });
    assert.equal(response.status, 409); assert.equal((await response.json()).error.code, 'RESOURCE_IN_USE');
    assert.equal((await fetch(`${url}/1`, { method: 'PATCH', headers, body: '{"name":"RAM"}' })).status, 404);
    code = 'UNKNOWN';
    response = await fetch(url, { method: 'POST', headers, body: '{"name":"RAM"}' });
    assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /secret|SQL/);
  });
});
