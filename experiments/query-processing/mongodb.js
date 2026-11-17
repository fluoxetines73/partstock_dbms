const hello = db.hello();
if (db.getName() !== 'partstock_lab' || hello.setName !== 'rs0' || !hello.isWritablePrimary
    || process.env.MONGO_LAB_DATABASE !== db.getName()) {
  throw new Error('Expected the configured MongoDB lab on rs0 PRIMARY.');
}
const names = ['products', 'orders'].map(name => 'qp_' + runId + '_' + name);
const [productStore, orderStore] = names.map(name => db.getCollection(name));
const confirmed = { status: 'CONFIRMED', confirmed_at: { $gte: '2026-11-01', $lt: '2026-11-16' } };
const cases = {
  filter: [productStore, [
    { $match: { category_id: 2, brand_id: 3, price: { $gte: 130000, $lte: 160000 }, stock: { $gt: 0 } } },
    { $sort: { _id: 1 } }, { $project: { _id: 1 } },
  ], row => row._id],
  never_sold: [productStore, [
    { $lookup: { from: names[1], localField: '_id', foreignField: 'line.product_id',
      pipeline: [{ $match: { status: { $in: ['CONFIRMED', 'CANCELLED'] } } }, { $limit: 1 }], as: 'sales' } },
    { $match: { 'sales.0': { $exists: false } } }, { $sort: { _id: 1 } }, { $project: { _id: 1 } },
  ], row => row._id],
  revenue: [orderStore, [
    { $match: confirmed },
    { $group: { _id: null, total: { $sum: { $multiply: ['$line.quantity', '$line.unit_price'] } } } },
  ], row => row.total],
};
cases.filter_scan = [...cases.filter, { hint: { $natural: 1 } }];
const created = [];
try {
  for (const name of names) {
    db.createCollection(name);
    created.push(name);
  }
  productStore.insertMany(products.map(p => ({ _id: p[0], category_id: p[1], brand_id: p[2], price: p[3], stock: p[4] })));
  orderStore.insertMany(orders.map(o => ({ _id: o[0], status: o[1], confirmed_at: o[2],
    line: { product_id: o[3], quantity: o[4], unit_price: o[5] } })));
  productStore.createIndex({ category_id: 1, brand_id: 1, price: 1 });
  orderStore.createIndex({ status: 1, confirmed_at: 1 });
  orderStore.createIndex({ 'line.product_id': 1 });
  const queries = {};
  for (const [name, [collection, pipeline, normalize, options = {}]] of Object.entries(cases)) {
    const rows = collection.aggregate(pipeline, options).toArray().map(normalize);
    collection.explain('executionStats').aggregate(pipeline, options);
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const sample = collection.explain('executionStats').aggregate(pipeline, options);
      samples.push(sample);
    }
    queries[name] = { rows, samples };
  }
  print(JSON.stringify({ version: db.version(), topology: hello.setName, members: hello.hosts.length,
    indexes: [productStore.getIndexes(), orderStore.getIndexes()], queries }));
} finally {
  for (const name of created) db.getCollection(name).drop();
}
