'use strict';

// Shared by Node.js and mongosh. Each check records the observed data before asserting.
const demoSku = 'E-COUNT-01';
const fullPeriod = ['1000-01-01 00:00:00', '9999-01-01 00:00:00'];

function validCount(n, reason) {
  return Number.isSafeInteger(n) && n >= 0 && n <= 2147483647 &&
    typeof reason === 'string' && reason.trim().length > 0 && [...reason.trim()].length <= 500;
}

function validThreshold(n) {
  return n === null || (Number.isSafeInteger(n) && n >= 0 && n <= 2147483647);
}

function requirePeriod(from, to) {
  function valid(s) {
    if (typeof s !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return false;
    const iso = s.replace(' ', 'T');
    const date = new Date(iso + 'Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,19) === iso;
  }
  if (!valid(from) || !valid(to) || from >= to) throw businessFailure('INVALID_PERIOD');
}

function businessFailure(code) {
  return Object.assign(new Error(code), { stockCaseCode: code });
}

function latch() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function waitForStage(signal, task, label) {
  let timer;
  try {
    await Promise.race([
      signal.promise,
      task.then(() => { throw new Error('Operation finished before ' + label); }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timed out at ' + label)), 20000); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function runStockCases(a, checks) {
  function check(id, actual, expected) {
    const passed = JSON.stringify(actual) === JSON.stringify(expected);
    checks.push({ id, actual, expected, passed });
    if (!passed) throw new Error(id + ': ' + JSON.stringify(actual) + ' expected ' + JSON.stringify(expected));
  }
  const getHistory = (sku, start, end, kind) => a.read(r => r.history(sku, start, end, kind));
  async function resultCode(task) {
    try { await task; return 'ACCEPTED'; }
    catch (e) { if (e.stockCaseCode) return e.stockCaseCode; throw e; }
  }
  const getThreshold = sku => a.read(r => r.threshold(sku));
  const dashboard = async r => {
    const history = await r.history(demoSku, ...fullPeriod);
    const t = await r.threshold(demoSku);
    return [history.closing, history.rows.length, t.quantity, t.state];
  };
  const see = () => a.read(dashboard);
  const countState = code => a.read(r => r.countState(code));
  async function sell(n) {
    const order = await a.draftSale(n);
    const outcome = await a.confirmSale(order);
    if (outcome !== 'CONFIRMED') throw new Error('Sale preparation: ' + outcome);
    return order;
  }

  const sku = 'SSD-KIN-500', beginSale = '2026-11-06 11:00:00', beginCancel = '2026-11-07 15:00:00';
  const seed = await getHistory(sku, '2026-11-01 00:00:00', '2026-11-08 00:00:00');
  check('09.1 source documents', [seed.opening, seed.closing, seed.rows.map(m => [m.kind, m.delta, m.after, m.source])],
    [0, 8, [['IMPORT', 8, 8, 'PN-20261101-000001'], ['SALE', -1, 7, 'DB-20261106-000002'], ['SALE_CANCEL', 1, 8, 'DB-20261106-000002']]]);
  const boundary = await getHistory(sku, beginSale, beginCancel);
  check('09.2 half-open period', [boundary.opening, boundary.closing, boundary.rows.map(m => m.kind)], [8, 7, ['SALE']]);
  const filtered = await getHistory(sku, beginSale, beginCancel, 'IMPORT');
  check('09.3 display filter preserves balances', [filtered.opening, filtered.closing, filtered.rows], [8, 7, []]);
  const quiet = await getHistory(sku, '2026-11-08 00:00:00', '2026-11-09 00:00:00');
  check('09.4 quiet period', [quiet.opening, quiet.closing, quiet.rows], [8, 8, []]);

  check('09 invalid date / reversed period', [
    await resultCode(getHistory(sku,'2026-02-30 00:00:00',beginSale)),
    await resultCode(getHistory(sku,beginCancel,beginSale))], ['INVALID_PERIOD','INVALID_PERIOD']);

  await a.setThreshold(sku, 9);
  await a.setThreshold('RAM-KIN-08', 8);
  await a.setThreshold('RAM-KIN-16', 4);
  const bands = [];
  for (const s of [sku, 'RAM-KIN-08', 'RAM-KIN-16', 'SSD-SAM-1000']) {
    const t = await getThreshold(s);
    bands.push([t.quantity, t.limit, t.state]);
  }
  check('10.1 below, equal, above, unconfigured', bands, [[8,9,'LOW'],[8,8,'OK'],[5,4,'OK'],[4,null,'UNCONFIGURED']]);
  check('10.2 low-stock list', await a.read(r => r.lowList()), [[sku,8,9,1]]);
  check('10.3 reject negative threshold, keep current configuration',
    [await resultCode(a.setThreshold(sku,-1)),(await getThreshold(sku)).limit],['INVALID_THRESHOLD',9]);
  await a.setThreshold(sku,null);
  check('10.4 clear threshold, empty warning list', [(await getThreshold(sku)).state,await a.read(r=>r.lowList())],['UNCONFIGURED',[]]);
  await a.newProduct();
  await a.setThreshold(demoSku,0);
  check('10.5 zero stock equal to zero threshold', await see(), [0,0,0,'OK']);
  await a.setThreshold(demoSku, 9);
  check('02+10 initial inventory', await see(), [0,0,0,'LOW']);
  const receipt = await a.receive(10);
  check('04+09+10 receipt', await see(), [10,1,10,'OK']);

  let order;
  await a.read(async r => {
    const before = await dashboard(r);
    order = await sell(2);                       // separate writer commits while this snapshot stays open
    const again = await dashboard(r);
    check('09+10 stable reader across committed sale', [before, again], [[10,1,10,'OK'],[10,1,10,'OK']]);
  });
  check('07+10 next reader sees committed sale', await see(), [8,2,8,'LOW']);
  const alertsAfterSale=await a.read(r=>r.lowList());
  await a.cancel(order);
  check('07+08 live low-stock list', [alertsAfterSale,await a.read(r=>r.lowList())], [[[demoSku,8,9,1]],[]]);
  check('08+10 cancel restores stock and clears alert', await see(), [10,3,10,'OK']);
  const traced = await getHistory(demoSku, ...fullPeriod);
  check('09.5 linked live receipt, sale and cancellation',
    traced.rows.map(m => [m.kind, m.delta, m.source === (m.kind === 'IMPORT' ? receipt.code : order.code)]),
    [['IMPORT',10,true],['SALE',-2,true],['SALE_CANCEL',2,true]]);

  check('12.1 reject invalid count / blank reason', [
    await a.openCount('KK-BAD1', -1, 'Test'), await a.openCount('KK-BAD2', 10, '   '),
    await countState('KK-BAD1'), await countState('KK-BAD2')], ['INVALID_COUNT','INVALID_COUNT',null,null]);
  await a.openCount('KK-EQUAL', 10, 'Kiem dem');
  check('12.2 unchanged count is recorded once', [await a.confirmCount('KK-EQUAL'), await countState('KK-EQUAL'),
    await a.confirmCount('KK-EQUAL'), await see()], ['NO_CHANGE','CONFIRMED','ALREADY_CONFIRMED',[10,3,10,'OK']]);
  await a.openCount('KK-SALE', 9, 'Thieu mot linh kien');
  await sell(2);                                 // capture 10 / count 9, sale commits, current stock 8
  check('12.3 sale between capture and confirm', [await a.confirmCount('KK-SALE'), await see()], ['ADJUSTED',[7,5,7,'LOW']]);
  const adj = await getHistory(demoSku, ...fullPeriod, 'ADJUSTMENT');
  check('09+12 count source and reason', adj.rows.map(m => [m.delta,m.after,m.source,m.reason]),
    [[-1,7,'KK-SALE','Thieu mot linh kien']]);

  await a.openCount('KK-RACE', 9, 'Tim thay hai linh kien');
  const staged = latch(), started = latch(), release = latch();
  const first = a.confirmCount('KK-RACE', { staged: async () => { staged.resolve(); await release.promise; } });
  let second;
  try {
    await waitForStage(staged, first, 'first count staged');
    check('09+10+12 uncommitted adjustment invisible', await see(), [7,5,7,'LOW']);
    second = a.confirmCount('KK-RACE', { started: () => started.resolve() });
    await waitForStage(started, second, 'second transaction started');
  } finally {
    release.resolve();
    await Promise.allSettled(second ? [first,second] : [first]);
  }
  check('12.4 overlapping confirmations change stock once', [await first, await second, await see()],
    ['ADJUSTED','ALREADY_CONFIRMED',[9,6,9,'OK']]);

  await a.openCount('KK-A', 10, 'Dem lan A');
  await a.openCount('KK-B', 10, 'Dem lan B cung moc');
  check('12.5 two different counts from same count revision',
    [await a.confirmCount('KK-A'),await a.confirmCount('KK-B'),await countState('KK-B'),await see()],
    ['ADJUSTED','COUNT_SUPERSEDED','DRAFT',[10,7,10,'OK']]);
  await a.openCount('KK-FAULT', 11, 'Kiem tra rollback');
  check('12.6 rollback after updating inventory', [await a.confirmCount('KK-FAULT',{ fault: true }),
    await countState('KK-FAULT'),await see()], ['FAULT_INJECTED','DRAFT',[10,7,10,'OK']]);
  check('12.7 retry after rollback', [await a.confirmCount('KK-FAULT'),await see()], ['ADJUSTED',[11,8,11,'OK']]);
  await a.openCount('KK-NEG', 1, 'Chenh lech am');
  await sell(3);
  check('12.8 reject adjustment that would make stock negative', [await a.confirmCount('KK-NEG'),
    await countState('KK-NEG'),await see()], ['NEGATIVE_STOCK','DRAFT',[8,9,8,'LOW']]);

  await sell(7);
  const orders = [await a.draftSale(1), await a.draftSale(1)];
  const outcomes = await Promise.all(orders.map(o => a.confirmSale(o)));
  const states = await Promise.all(orders.map(o => a.saleState(o)));
  check('07+09+10 last unit, one winner', [outcomes.slice().sort(),
    [states[outcomes.indexOf('CONFIRMED')], states[outcomes.indexOf('INSUFFICIENT_STOCK')]], await see()],
    [['CONFIRMED','INSUFFICIENT_STOCK'],['CONFIRMED','DRAFT'],[0,11,0,'LOW']]);
  const winner = orders[outcomes.indexOf('CONFIRMED')];
  const final = await getHistory(demoSku, ...fullPeriod);
  check('09.6 winning order is the sole source for its sale',
    orders.map(o => final.rows.filter(m => m.kind==='SALE' && m.source===o.code).length),
    orders.map(o => o.code === winner.code ? 1 : 0));
  await a.receive(10);
  await a.openCount('KK-PAR',9,'Dem khi dang ban');
  const parallelOrder=await a.draftSale(2);
  const parallel=await Promise.all([a.confirmCount('KK-PAR'),a.confirmSale(parallelOrder)]);
  check('07+12 concurrent sale and count preserve both changes', [parallel,await see()],
    [['ADJUSTED','CONFIRMED'],[7,14,7,'LOW']]);
  const combined=await getHistory(demoSku,...fullPeriod);
  const countMove=combined.rows.find(m=>m.kind==='ADJUSTMENT' && m.source==='KK-PAR');
  const saleMove=combined.rows.find(m=>m.kind==='SALE' && m.source===parallelOrder.code);
  const correctlyOrdered=(countMove?.after===9 && saleMove?.after===7) || (countMove?.after===7 && saleMove?.after===8);
  check('09+12 parallel writers leave two attributable movements',
    [countMove?.delta,saleMove?.delta,correctlyOrdered],[-1,-2,true]);
  check('all SKUs: stock reconciles with ledger', await a.read(r => r.mismatches()), []);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { demoSku, validCount, validThreshold, requirePeriod, businessFailure, runStockCases };
}
