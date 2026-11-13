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

try {
  products.insertMany(documents);
  const report = {
    version: db.version(),
    database: db.getName(),
    replicaSet: hello.setName,
    members: hello.hosts.length,
    rows: products.countDocuments({}),
    indexes_before: products.getIndexes(),
    sku_before: explain(queries.sku),
    brand_price_before: explain(queries.brand_price),
  };
  products.createIndex({ sku: 1 }, { name: 'idx_sku' });
  products.createIndex({ brand_id: 1, selling_price: 1 }, { name: 'idx_brand_price' });
  report.indexes_after = products.getIndexes();
  report.sku_after = explain(queries.sku);
  report.brand_price_after = explain(queries.brand_price);
  for (const [name, filter] of Object.entries(queries)) {
    report[name + '_result'] = products.find(filter, projection).sort({ sku: 1 }).toArray()
      .map(row => [row.sku, row.name, row.brand_id, row.selling_price]);
  }
  print(JSON.stringify(report));
} finally {
  products.drop();
}
