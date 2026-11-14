#!/usr/bin/env bash
set -euo pipefail
umask 077

[[ "${MONGO_LAB_DATABASE:-}" == partstock_lab && "${MONGO_LAB_USERNAME:-}" == partstock_lab ]]
uri='mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true&authSource=admin'
credentials=(--username "${MONGO_INITDB_ROOT_USERNAME:?Run inside mongo-lab}"
             --password "${MONGO_INITDB_ROOT_PASSWORD:?Run inside mongo-lab}")
shell_args=("$uri" "${credentials[@]}")
tool_args=(--uri "$uri" "${credentials[@]}")

work=$(mktemp -d /tmp/partstock-br-mongo.XXXXXXXX)
run=${work##*.}
export BR_SRC="ps_br_src_${run}"
export BR_DST="ps_br_dst_${run}"
printf 'Source=%s\nTarget=%s\nFiles=%s\n' "$BR_SRC" "$BR_DST" "$work"
{ mongodump --version; mongorestore --version; } | tee "$work/tool-version.txt"

cat > "$work/seed.js" <<'JS'
const hello = db.hello();
if (hello.setName !== 'rs0' || !hello.isWritablePrimary) throw new Error('Expected rs0 PRIMARY');
const source = db.getSiblingDB(process.env.BR_SRC);
if (source.getCollectionNames().length) throw new Error('Source is not empty');

source.products.insertMany([
  {_id: 1, sku: 'RAM-KIN-08', selling_price: 420000},
  {_id: 2, sku: 'SSD-KIN-500', selling_price: 990000}
]);
source.sales_orders.insertOne({
  _id: 101, status: 'CONFIRMED',
  lines: [
    {product_id: 1, quantity: 2, unit_price: 420000},
    {product_id: 2, quantity: 1, unit_price: 990000}
  ]
});
source.inventory.insertMany([
  {_id: 1, quantity_on_hand: 7},
  {_id: 2, quantity_on_hand: 4}
]);
JS
mongosh --quiet "${shell_args[@]}" --file "$work/seed.js"

cat > "$work/verify.js" <<'JS'
const snapshot = db.getSiblingDB(process.env.BR_DB);
const orders = snapshot.sales_orders.find({status: 'CONFIRMED'}).toArray();
const lines = orders.flatMap(order => order.lines);
const stock = snapshot.inventory.find().toArray();
print(JSON.stringify({
  products: snapshot.products.countDocuments({}),
  confirmed_orders: orders.length,
  order_lines: lines.length,
  inventory_rows: stock.length,
  stock_total: stock.reduce((sum, row) => sum + row.quantity_on_hand, 0),
  confirmed_total_vnd: lines.reduce((sum, row) => sum + row.quantity * row.unit_price, 0)
}));
JS

expected='{"products":2,"confirmed_orders":1,"order_lines":2,"inventory_rows":2,"stock_total":11,"confirmed_total_vnd":1830000}'
BR_DB="$BR_SRC" mongosh --quiet "${shell_args[@]}" --file "$work/verify.js" | tee "$work/before.json"
if [[ "$(<"$work/before.json")" != "$expected" ]]; then
  echo 'FAIL: MongoDB source does not match the fixture.' >&2
  exit 1
fi

TIMEFORMAT='elapsed_seconds=%3R'
{ time mongodump "${tool_args[@]}" --db "$BR_SRC" \
    --archive="$work/mongo.archive"; } 2>&1 | tee "$work/backup.log"
wc -c < "$work/mongo.archive" | tee "$work/dump-bytes.txt"

mongosh --quiet "${shell_args[@]}" --eval '
  const target = db.getSiblingDB(process.env.BR_DST);
  if (target.getCollectionNames().length) throw new Error("Target is not empty");
  print("Target is empty");
'
{ time mongorestore "${tool_args[@]}" --stopOnError --archive="$work/mongo.archive" \
    --nsInclude="$BR_SRC.*" --nsFrom="$BR_SRC.*" --nsTo="$BR_DST.*"; } \
  2>&1 | tee "$work/restore.log"

BR_DB="$BR_DST" mongosh --quiet "${shell_args[@]}" --file "$work/verify.js" | tee "$work/after.json"
if [[ "$(<"$work/after.json")" != "$expected" ]]; then
  echo 'FAIL: MongoDB restored data differs from the source.' >&2
  exit 1
fi
echo 'PASS: MongoDB before and after restore match.'
