// documents, collectionName are injected by the runner from deterministic fixtures.
const hello = db.hello();
if (db.getName() !== 'partstock_lab' || hello.setName !== 'rs0' || !hello.isWritablePrimary) {
  throw new Error('Expected MongoDB lab rs0 PRIMARY');
}
if (db.getCollectionNames().includes(collectionName)) throw new Error('Collection already exists');
db.createCollection(collectionName);
const products = db.getCollection(collectionName);
const phases = [];
function snapshot(phase, expanded) {
  const rows = products.find().toArray();
  const valid = rows.every(row => {
    const expected = documents[row._id - 1];
    return expected && row.sku === expected.sku && row.name === expected.name &&
      row.selling_price === expected.selling_price && row.specifications.description ===
      expected.specifications.description.repeat(expanded ? 16 : 1);
  });
  if (!valid) throw new Error('Fixture values differ');
  const flushed = db.adminCommand({ fsync: 1 });
  if (!flushed.ok) throw new Error('fsync failed');
  const stats = db.runCommand({ collStats: collectionName, scale: 1 });
  if (!stats.ok) throw new Error('collStats failed');
  phases.push({ phase, logical: {
    count: rows.length, idSum: rows.reduce((sum, row) => sum + row._id, 0),
    priceSum: rows.reduce((sum, row) => sum + row.selling_price, 0),
    payloadBytes: rows.reduce((sum, row) => sum + row.specifications.description.length, 0),
    invalid: valid ? 0 : 1,
  }, size: stats.size, storageSize: stats.storageSize, freeStorageSize: stats.freeStorageSize ?? null,
    totalIndexSize: stats.totalIndexSize, indexSizes: stats.indexSizes,
    engine: stats.wiredTiger ? 'WiredTiger' : 'unknown',
    creationString: stats.wiredTiger?.creationString ?? null,
  });
}
try {
  products.createIndex({ sku: 1 }, { unique: true });
  snapshot('empty', false);
  products.insertMany(documents.slice(0, 1000)); snapshot('1000', false);
  products.insertMany(documents.slice(1000)); snapshot('5000', false);
  // Pipeline updates every document using its current description.
  products.updateMany({}, [{ $set: { 'specifications.description': {
    $reduce: { input: { $range: [0, 16] }, initialValue: '',
      in: { $concat: ['$$value', '$specifications.description'] } }
  } } }]);
  snapshot('expanded', true);
  products.deleteMany({ _id: { $mod: [2, 0] } }); snapshot('deleted_half', true);
  print(JSON.stringify({ version: db.version(), replicaSet: hello.setName,
    members: hello.hosts.length, database: db.getName(), phases }));
} finally { products.drop(); }
