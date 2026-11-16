#!/usr/bin/env bash
set -euo pipefail
umask 077

[[ "${MYSQL_DATABASE:-}" == partstock_lab && "${MYSQL_USER:-}" == partstock_lab ]]
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:?Run inside mysql-lab}"
mysql=(mysql --user=root)

work=$(mktemp -d /tmp/partstock-br-mysql.XXXXXXXX)
run=${work##*.}
src="ps_br_src_${run}"
dst="ps_br_dst_${run}"
printf 'Source=%s\nTarget=%s\nFiles=%s\n' "$src" "$dst" "$work"
mysqldump --version | tee "$work/tool-version.txt"

"${mysql[@]}" -e "CREATE DATABASE \`$src\`"
"${mysql[@]}" "$src" <<'SQL'
CREATE TABLE products (
  id BIGINT UNSIGNED PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  selling_price DECIMAL(15,0) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE sales_orders (
  id BIGINT UNSIGNED PRIMARY KEY,
  status VARCHAR(16) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE sales_order_lines (
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15,0) NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES sales_orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE inventory (
  product_id BIGINT UNSIGNED PRIMARY KEY,
  quantity_on_hand INT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

INSERT INTO products VALUES (1,'RAM-KIN-08',420000),(2,'SSD-KIN-500',990000);
INSERT INTO sales_orders VALUES (101,'CONFIRMED');
INSERT INTO sales_order_lines VALUES (101,1,2,420000),(101,2,1,990000);
INSERT INTO inventory VALUES (1,7),(2,4);
SQL

verify() {
  "${mysql[@]}" --batch --skip-column-names "$1" <<'SQL'
SELECT
  (SELECT COUNT(*) FROM products),
  (SELECT COUNT(*) FROM sales_orders WHERE status = 'CONFIRMED'),
  (SELECT COUNT(*) FROM sales_order_lines),
  (SELECT COUNT(*) FROM inventory),
  (SELECT SUM(quantity_on_hand) FROM inventory),
  (SELECT SUM(l.quantity * l.unit_price)
   FROM sales_order_lines l JOIN sales_orders o ON o.id = l.order_id
   WHERE o.status = 'CONFIRMED');
SQL
}

expected=$'2\t1\t2\t2\t11\t1830000'
verify "$src" | tee "$work/before.tsv"
if [[ "$(<"$work/before.tsv")" != "$expected" ]]; then
  echo 'FAIL: MySQL source does not match the fixture.' >&2
  exit 1
fi

TIMEFORMAT='elapsed_seconds=%3R'
{ time mysqldump --user=root --single-transaction --skip-lock-tables \
    --skip-add-drop-table --no-tablespaces --set-gtid-purged=OFF \
    --result-file="$work/mysql.sql" "$src"; } 2>&1 | tee "$work/backup.log"
wc -c < "$work/mysql.sql" | tee "$work/dump-bytes.txt"

"${mysql[@]}" -e "CREATE DATABASE \`$dst\`"
{ time "${mysql[@]}" "$dst" < "$work/mysql.sql"; } 2>&1 | tee "$work/restore.log"
verify "$dst" | tee "$work/after.tsv"
if [[ "$(<"$work/after.tsv")" != "$expected" ]]; then
  echo 'FAIL: MySQL restored data differs from the source.' >&2
  exit 1
fi
echo 'PASS: MySQL before and after restore match.'
