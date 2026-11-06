// Run as the local MongoDB administrator after mongo-lab is healthy.
// This initializes only the proposed local rs0 / partstock_lab environment.
const labName = process.env.MONGO_LAB_DATABASE;
const labUsername = process.env.MONGO_LAB_USERNAME;
const labPassword = process.env.MONGO_LAB_PASSWORD;
if (labName !== "partstock_lab" || !labUsername || !labPassword) {
  throw new Error("Expected configured partstock_lab credentials; refusing initialization.");
}

const options = db.adminCommand({ getCmdLineOpts: 1 });
// --replSet is reported as replSet; YAML configuration may use replSetName.
const replication = options.parsed.replication ?? {};
const configuredSet = replication.replSetName ?? replication.replSet;
if (configuredSet !== "rs0") {
  throw new Error("Expected replica set rs0; wait for the final server to start.");
}

try {
  const status = rs.status();
  if (status.set !== "rs0") throw new Error("Unexpected replica set.");
} catch (error) {
  if (error.code !== 94 && error.codeName !== "NotYetInitialized") throw error;
  const result = rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "mongo-lab:27017" }],
  });
  if (!result.ok) throw new Error("Replica set initialization failed.");
}

const deadline = Date.now() + 60000;
while (!db.hello().isWritablePrimary) {
  if (Date.now() > deadline) throw new Error("Timed out waiting for PRIMARY.");
  sleep(1000);
}

const lab = db.getSiblingDB(labName);
if (!lab.getUser(labUsername)) {
  lab.createUser({
    user: labUsername,
    pwd: labPassword,
    roles: [{ role: "readWrite", db: labName }],
  });
  print("Created lab user with readWrite on partstock_lab.");
} else {
  print("Kept existing lab user; existing password and roles were not changed.");
}
print("Replica set rs0 is PRIMARY. Run check-mongo.js with the lab user next.");
