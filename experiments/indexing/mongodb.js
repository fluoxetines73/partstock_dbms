const hello = db.hello();
if (db.getName() !== 'partstock_lab' || hello.setName !== 'rs0' || !hello.isWritablePrimary) {
  throw new Error('Expected MongoDB lab database on rs0 PRIMARY.');
}

const collectionName = 'indexing_products_' + runId;
db.createCollection(collectionName);
const products = db.getCollection(collectionName);
const queries = {
  sku: { sku: 'IDX-0004201' },
  brand_price: { brand_id: 7, selling_price: { $gte: 500000, $lte: 520000 } },
};
const projection = { _id: 0, sku: 1, name: 1, brand_id: 1, selling_price: 1 };

function explain(filter) {
  const result = products.find(filter, projection).explain('executionStats');
  const { nReturned, totalKeysExamined, totalDocsExamined, executionTimeMillis, executionStages } = result.executionStats;
  return {
    winningPlan: result.queryPlanner.winningPlan,
    nReturned, totalKeysExamined, totalDocsExamined, executionTimeMillis, executionStages,
  };
}

function measureQuery(filter) {
  explain(filter); // Warm-up
  const samples = [];
  for (let run = 0; run < sampleCount; run++) {
    const sample = explain(filter);
    samples.push(sample);
  }
  return samples;
}

function indexSizes() {
  const { indexSizes, totalIndexSize, scaleFactor } = products.stats({ scale: 1 });
  return { indexSizes, totalIndexSize, scaleFactor };
}

function measureUpdates() {
  const filter = { _id: { $gte: 1, $lte: updateRowCount } };
  const options = { hint: '_id_', writeConcern: { w: 'majority' } };
  const samples = [];
  for (let run = 0; run <= sampleCount; run++) {
    const started = process.hrtime.bigint();
    const update = products.updateMany(filter, { $inc: { selling_price: priceStep } }, options);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    const reset = products.updateMany(filter, { $inc: { selling_price: -priceStep } }, options);
    const baseline = products.find(filter, { _id: 1, selling_price: 1 }).toArray();
    const baselineMatches = baseline.filter(row => documents[row._id - 1].selling_price === row.selling_price).length;
    samples.push({ elapsedMs, modified: update.modifiedCount, reset: reset.modifiedCount, baselineMatches });
  }
  return samples;
}

try {
  products.insertMany(documents);
  const report = {
    version: db.version(),
    database: db.getName(),
    replicaSet: hello.setName,
    members: hello.hosts.length,
    rows: products.countDocuments({}),
    indexes_before: products.getIndexes(),
  };
  if (measureIndexSize) {
    report.index_size_before = indexSizes();
  } else if (measureUpdateCost) {
    report.update_cost_before = measureUpdates();
  } else {
    report.sku_before = measureQuery(queries.sku);
    report.brand_price_before = measureQuery(queries.brand_price);
  }
  products.createIndex({ sku: 1 }, { name: 'idx_sku' });
  products.createIndex({ brand_id: 1, selling_price: 1 }, { name: 'idx_brand_price' });
  report.indexes_after = products.getIndexes();
  if (measureIndexSize) {
    report.index_size_after = indexSizes();
  } else if (measureUpdateCost) {
    report.update_cost_after = measureUpdates();
  } else {
    report.sku_after = measureQuery(queries.sku);
    report.brand_price_after = measureQuery(queries.brand_price);
  }
  for (const [name, filter] of Object.entries(queries)) {
    report[name + '_result'] = products.find(filter, projection).sort({ sku: 1 }).toArray()
      .map(row => [row.sku, row.name, row.brand_id, row.selling_price]);
  }
  print(JSON.stringify(report));
} finally {
  products.drop();
}
