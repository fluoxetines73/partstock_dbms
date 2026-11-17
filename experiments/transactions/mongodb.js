// MongoDB side of the Transaction lab. Run by run.cjs, which prepends:
//   const runId = '<24 hex>'; const fixture = { products, orders }; const cases = [...];
// Same business rules as F03 section 7: one document per order with embedded lines, a separate inventory
// collection, a ledger with a unique {movement_type, line_id} index, and one multi-document transaction.
const dbName = 'partstock_lab';
const txOptions = { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } };

function labError(code) {
  return Object.assign(new Error(code), { labCode: code });
}

async function main() {
  const hello = await db.hello();
  if (db.getName() !== dbName || hello.setName !== 'rs0' || !hello.isWritablePrimary
      || process.env.MONGO_LAB_DATABASE !== dbName) {
    throw new Error('Expected the configured MongoDB lab on rs0 PRIMARY.');
  }
  const names = { inventory: `tx_${runId}_inventory`, orders: `tx_${runId}_orders`, ledger: `tx_${runId}_ledger` };
  const created = [];
  try {
    for (const name of Object.values(names)) {
      await db.createCollection(name);
      created.push(name);
    }
    await db.getCollection(names.ledger).createIndex({ movement_type: 1, line_id: 1 }, { unique: true });
    const price = Object.fromEntries(fixture.products.map(product => [product.sku, product.price]));
    await db.getCollection(names.inventory).insertMany(
      fixture.products.map(product => ({ _id: product.sku, quantity_on_hand: product.stock })));
    // Opening stock is a ledger row too, so stock always equals the sum of movements (invariant I2).
    await db.getCollection(names.ledger).insertMany(fixture.products.map(product => ({
      movement_type: 'IMPORT', line_id: 'OPEN-' + product.sku, sku: product.sku,
      quantity_delta: product.stock, quantity_after: product.stock,
    })));
    await db.getCollection(names.orders).insertMany(fixture.orders.map(order => ({
      _id: order.label, status: 'DRAFT',
      lines: order.lines.map((line, index) => ({
        _id: `${order.label}-${index + 1}`, sku: line.sku, quantity: line.quantity, unit_price: price[line.sku],
      })),
    })));

    // `scope` is either a session database (inside a transaction) or the plain database (no transaction).
    const collections = scope => ({
      inventory: scope.getCollection(names.inventory),
      orders: scope.getCollection(names.orders),
      ledger: scope.getCollection(names.ledger),
    });
    const bySku = (a, b) => (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0);

    async function confirmSteps(scope, label, fault) {
      const { inventory, orders, ledger } = collections(scope);
      const changed = await orders.updateOne({ _id: label, status: 'DRAFT' }, { $set: { status: 'CONFIRMED', confirmed_at: new Date() } });
      if (changed.matchedCount === 0) throw labError('ORDER_NOT_DRAFT');
      if (fault === 'before_stock_update') throw labError('FAULT_INJECTED');
      const order = await orders.findOne({ _id: label });
      for (const line of [...order.lines].sort(bySku)) {
        const moved = await inventory.updateOne(
          { _id: line.sku, quantity_on_hand: { $gte: line.quantity } }, { $inc: { quantity_on_hand: -line.quantity } });
        if (moved.matchedCount === 0) throw labError('INSUFFICIENT_STOCK');
        const after = (await inventory.findOne({ _id: line.sku })).quantity_on_hand;
        if (fault === 'before_ledger') throw labError('FAULT_INJECTED');
        await ledger.insertOne({
          movement_type: 'SALE', line_id: line._id, sku: line.sku, quantity_delta: -line.quantity, quantity_after: after,
        });
      }
    }

    async function cancelSteps(scope, label) {
      const { inventory, orders, ledger } = collections(scope);
      const changed = await orders.updateOne({ _id: label, status: 'CONFIRMED' }, { $set: { status: 'CANCELLED', cancelled_at: new Date() } });
      if (changed.matchedCount === 0) throw labError('ORDER_NOT_CANCELLABLE');
      const order = await orders.findOne({ _id: label });
      for (const line of [...order.lines].sort(bySku)) {
        await inventory.updateOne({ _id: line.sku }, { $inc: { quantity_on_hand: line.quantity } });
        const after = (await inventory.findOne({ _id: line.sku })).quantity_on_hand;
        await ledger.insertOne({
          movement_type: 'SALE_CANCEL', line_id: line._id, sku: line.sku, quantity_delta: line.quantity, quantity_after: after,
        });
      }
    }

    async function inTransaction(steps) {
      const session = db.getMongo().startSession();
      let attempts = 0;
      try {
        await session.withTransaction(async () => {
          attempts++;
          await steps(session.getDatabase(dbName));
        }, txOptions);
        return { attempts };
      } catch (error) {
        return { code: error.labCode || 'ERROR:' + (error.codeName || error.name), attempts };
      } finally {
        await session.endSession();
      }
    }

    // The client disappears after every write but before commitTransaction: ending the session aborts it.
    async function abandoned(label) {
      const session = db.getMongo().startSession();
      session.startTransaction(txOptions);
      try {
        await confirmSteps(session.getDatabase(dbName), label, null);
      } finally {
        await session.endSession();
      }
      return { code: 'CONNECTION_LOST', attempts: 1 };
    }

    async function withoutTransaction(label, fault) {
      try {
        await confirmSteps(db, label, fault);
        return { attempts: 1 };
      } catch (error) {
        return { code: error.labCode || 'ERROR:' + error.name, attempts: 1 };
      }
    }

    async function snapshot() {
      const { inventory, orders, ledger } = collections(db);
      const stock = {};
      for (const row of await inventory.find().toArray()) stock[row._id] = row.quantity_on_hand;
      const status = {};
      const lineIds = {};
      for (const row of await orders.find().toArray()) {
        status[row._id] = row.status;
        lineIds[row._id] = row.lines.map(line => line._id);
      }
      const movements = await ledger.find().toArray();
      const counts = { SALE: 0, SALE_CANCEL: 0 };
      for (const move of movements) if (move.movement_type in counts) counts[move.movement_type]++;
      // Invariants I1, I2, I4 (same meaning as backend/tests-db/uc04-07-08.cjs).
      const violations = [];
      for (const [sku, quantity] of Object.entries(stock)) {
        if (quantity < 0) violations.push('I1:' + sku);
        const sum = movements.filter(move => move.sku === sku).reduce((total, move) => total + move.quantity_delta, 0);
        if (sum !== quantity) violations.push('I2:' + sku);
      }
      for (const [label, ids] of Object.entries(lineIds)) {
        for (const id of ids) {
          const sales = movements.filter(move => move.line_id === id && move.movement_type === 'SALE').length;
          const cancels = movements.filter(move => move.line_id === id && move.movement_type === 'SALE_CANCEL').length;
          const expected = { DRAFT: [0, 0], CONFIRMED: [1, 0], CANCELLED: [1, 1] }[status[label]];
          if (sales !== expected[0] || cancels !== expected[1]) violations.push('I4:' + id);
        }
      }
      return { orders: status, stock, movements: counts, violations };
    }

    const results = [];
    for (const step of cases) {
      let outcome;
      if (step.mode === 'transaction' && step.action === 'confirm') outcome = await inTransaction(scope => confirmSteps(scope, step.order, step.fault));
      else if (step.mode === 'transaction' && step.action === 'cancel') outcome = await inTransaction(scope => cancelSteps(scope, step.order));
      else if (step.mode === 'abandon') outcome = await abandoned(step.order);
      else if (step.mode === 'none') outcome = await withoutTransaction(step.order, step.fault);
      else throw new Error('Unknown case ' + step.id);
      results.push({ id: step.id, result: outcome.code || (step.action === 'cancel' ? 'CANCELLED' : 'CONFIRMED'), attempts: outcome.attempts, state: await snapshot() });
    }
    const indexes = (await db.getCollection(names.ledger).getIndexes()).map(index => index.name);
    print('RESULT ' + JSON.stringify({
      version: (await db.version()), topology: hello.setName, members: hello.hosts, ledger_indexes: indexes, results,
    }));
  } finally {
    for (const name of created) await db.getCollection(name).drop();
  }
}

main().catch(error => {
  console.error(error.name + ': ' + error.message);
  quit(1);
});
