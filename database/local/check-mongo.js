// Infrastructure check only, not a PartStock business transaction/benchmark.
const target = "partstock_lab";
if (process.env.MONGO_LAB_DATABASE !== target || db.hello().setName !== "rs0") {
  throw new Error("Expected partstock_lab on rs0; refusing writes.");
}
const identity = db.adminCommand({ connectionStatus: 1 }).authInfo;
if (!identity.authenticatedUsers.some(
  (user) => user.user === process.env.MONGO_LAB_USERNAME && user.db === target
)) {
  throw new Error("Run this check as the lab user, not the administrator.");
}

const lab = db.getSiblingDB(target);
const collection = lab.getCollection("_partstock_environment_check");
const ids = [new ObjectId(), new ObjectId()];
const filter = { _id: { $in: ids } };
const session = db.getMongo().startSession();
const transactional = session.getDatabase(target).getCollection(collection.getName());
function expectValues(a, b) {
  if (collection.findOne({ _id: ids[0] })?.quantity !== a ||
      collection.findOne({ _id: ids[1] })?.quantity !== b) {
    throw new Error("Unexpected quantities after transaction.");
  }
}

try {
  collection.insertMany([
    { _id: ids[0], quantity: 10 },
    { _id: ids[1], quantity: 20 },
  ]);
  session.startTransaction();
  transactional.updateMany(filter, { $inc: { quantity: -1 } });
  session.abortTransaction();
  expectValues(10, 20);
  print("PASS: rollback preserved both documents.");

  session.startTransaction();
  transactional.updateMany(filter, { $inc: { quantity: -1 } });
  session.commitTransaction();
  expectValues(9, 19);
  print("PASS: commit updated both documents.");
} finally {
  session.endSession();
  collection.deleteMany(filter);
}
