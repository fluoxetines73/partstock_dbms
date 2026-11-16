const runId = process.env.PARTSTOCK_E_RUN;
const action = process.env.PARTSTOCK_E_ACTION;
if (!/^[a-f0-9]{24}$/.test(runId ?? "") || db.getName() !== "partstock_lab") {
  throw new Error("Expected a Role E run ID and the partstock_lab database");
}

const sku = "GPU-LAST";
const productId = runId + ":" + sku;
const orderKey = id => runId + ":" + id;
const validOrders = ["A", "B"];

async function run() {
  const hello = await db.hello();
  if (hello.setName !== "rs0" || !hello.isWritablePrimary) {
    throw new Error("mongo-lab must be PRIMARY in replica set rs0");
  }
  if (process.env.MONGO_LAB_DATABASE !== "partstock_lab" ||
      process.env.MONGO_LAB_USERNAME !== "partstock_lab" ||
      !process.env.MONGO_LAB_PASSWORD) {
    throw new Error("Expected MongoDB Lab credentials from the mongo-lab service");
  }
  const auth = await db.auth("partstock_lab", process.env.MONGO_LAB_PASSWORD);
  if (auth !== 1 && auth?.ok !== 1) throw new Error("MongoDB Lab authentication failed");

  if (action === "setup") {
    await db.role_e_runs.insertOne({ _id: runId });
    await db.role_e_stock.insertOne({ _id: productId, runId, sku, quantity: 1, stockVersion: 0 });
    await db.role_e_orders.insertMany(validOrders.map(id => ({
      _id: orderKey(id), runId, orderId: id, sku, status: "DRAFT"
    })));
    await db.role_e_movements.createIndex({ runId: 1 });
    print("READY " + runId);
  } else if (action === "confirm") {
    const orderId = process.env.PARTSTOCK_E_ORDER;
    if (!validOrders.includes(orderId)) throw new Error("Expected order A or B");

    const session = db.getMongo().startSession();
    let attempts = 0;
    let outcome;
    try {
      await session.withTransaction(async () => {
        attempts++;
        const lab = session.getDatabase("partstock_lab");
        const order = await lab.role_e_orders.findOne({ _id: orderKey(orderId) });
        if (order === null) throw new Error("Order does not exist");
        if (order.status === "CONFIRMED") {
          outcome = "ALREADY_CONFIRMED";
          return;
        }

        const changed = await lab.role_e_stock.updateOne(
          { _id: productId, quantity: { $gte: 1 } },
          { $inc: { quantity: -1, stockVersion: 1 } }
        );
        if (changed.modifiedCount === 0) {
          outcome = "OUT_OF_STOCK";
          return;
        }
        // Giữ giao tác mở trong demo để phiên còn lại tranh chấp trên cùng document.
        await sleep(3000);
        const stock = await lab.role_e_stock.findOne({ _id: productId });
        await lab.role_e_orders.updateOne({ _id: orderKey(orderId) }, { $set: { status: "CONFIRMED" } });
        await lab.role_e_movements.insertOne({
          _id: orderKey(orderId), runId, orderId, sku, kind: "SALE",
          beforeQty: stock.quantity + 1, afterQty: stock.quantity
        });
        outcome = "CONFIRMED";
      });
      print(outcome);
      printjson({ orderId, outcome, attempts });
    } finally {
      await session.endSession();
    }
  } else if (action === "verify") {
    const stock = await db.role_e_stock.findOne({ _id: productId });
    const orders = await db.role_e_orders.find({ runId }).sort({ orderId: 1 }).toArray();
    const movements = await db.role_e_movements.find({ runId }).toArray();
    const confirmed = orders.filter(order => order.status === "CONFIRMED");
    const draft = orders.filter(order => order.status === "DRAFT");
    const movement = movements[0];
    const passed = stock?.quantity === 0 && stock.stockVersion === 1 &&
      orders.length === 2 && confirmed.length === 1 && draft.length === 1 &&
      movements.length === 1 && movement.orderId === confirmed[0].orderId &&
      movement.sku === sku && movement.kind === "SALE" &&
      movement.beforeQty === 1 && movement.afterQty === 0;

    printjson({ stock, orders, movements });
    print(passed ? "PASS" : "FAIL");
    if (!passed) quit(1);
  } else {
    throw new Error("Expected setup, confirm or verify");
  }
}

run();
