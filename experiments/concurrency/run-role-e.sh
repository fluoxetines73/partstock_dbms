#!/usr/bin/env bash
set -euo pipefail

lab_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$lab_dir/../.."
if [[ ${1:-} == stock-ucs ]]; then
  shift
  if [[ $# -eq 0 ]]; then set -- all --save; fi
  exec node "$lab_dir/stock-ucs/run.cjs" "$@"
fi

if [[ $# -ne 1 || ! "$1" =~ ^(mysql|mongodb|uc)$ ]]; then
  printf 'Usage: bash %s {mysql|mongodb|uc|stock-ucs [all|mysql|mongodb|reference] [--save]}\n' "$0" >&2
  exit 2
fi

export DOCKER_DEFAULT_PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"
compose=(docker compose --env-file .env.docker -f compose.local.yaml)
log_dir=$(mktemp -d)
trap 'rm -rf "$log_dir"' EXIT

new_run() {
  run_id=$(openssl rand -hex 12)
  printf 'Role E run: %s\n' "$run_id"
}

mysql_lab() {
  "${compose[@]}" exec -T mysql-lab sh -eu -c '
    test "$MYSQL_USER" = partstock_lab
    test "$MYSQL_DATABASE" = partstock_lab
    export MYSQL_PWD="$MYSQL_PASSWORD"
    exec mysql --protocol=TCP -h 127.0.0.1 -u "$MYSQL_USER" --batch --raw --skip-column-names "$MYSQL_DATABASE"
  '
}

mysql_file() {
  {
    printf "SET @run_id = '%s';\n" "$run_id"
    if [[ $# -eq 2 ]]; then printf '%s\n' "$2"; fi
    cat "$lab_dir/mysql/$1"
  } | mysql_lab
}

mongo_file() {
  "${compose[@]}" exec -T \
    -e "PARTSTOCK_E_RUN=$run_id" -e "PARTSTOCK_E_ACTION=$1" -e "PARTSTOCK_E_ORDER=${2:-}" \
    mongo-lab mongosh --quiet --norc \
    'mongodb://127.0.0.1:27017/partstock_lab?directConnection=true' \
    --file /dev/stdin < "$lab_dir/mongodb/last-item.js"
}

run_competitors() {
  "$1" A > "$log_dir/A" 2>&1 &
  local first=$!
  "$1" B > "$log_dir/B" 2>&1 &
  local second=$!
  local status=0
  wait "$first" || status=1
  wait "$second" || status=1
  for order in A B; do
    printf '\nOrder %s\n' "$order"
    cat "$log_dir/$order"
  done
  test "$status" -eq 0
  winner=$(awk '/(^|[[:space:]])CONFIRMED$/ { confirmed++; winner = (FILENAME == ARGV[1] ? "A" : "B") }
       /(^|[[:space:]])OUT_OF_STOCK$/ { rejected++ }
       END {
         if (confirmed != 1 || rejected != 1) exit 1
         print winner
       }' "$log_dir/A" "$log_dir/B")
}

check_replay() {
  printf '\nReplay winning order %s (expected: ALREADY_CONFIRMED)\n' "$winner"
  "$1" "$winner" | tee "$log_dir/replay"
  awk '/(^|[[:space:]])ALREADY_CONFIRMED$/ { found++ }
       END { exit !(found == 1) }' "$log_dir/replay"
}

mysql_confirm() {
  mysql_file 02-confirm-order.sql "SET @order_id = '$1', @hold_seconds = 3;"
}

mongo_confirm() {
  mongo_file confirm "$1"
}

setup_mysql() {
  mysql_file 01-setup.sql
  mysql_file routines.sql
}

verify_mysql() {
  mysql_file 03-verify.sql | tee "$log_dir/verify"
  test "$(tail -1 "$log_dir/verify")" = PASS
}

new_run
case "$1" in
  mysql)
    setup_mysql
    run_competitors mysql_confirm
    check_replay mysql_confirm
    verify_mysql
    ;;
  mongodb)
    mongo_file setup
    run_competitors mongo_confirm
    check_replay mongo_confirm
    mongo_file verify
    ;;
  uc)
    setup_mysql
    printf '\nUC10 before adjustment (expected: GPU-LAST only)\n'
    mysql_file uc10-low-stock.sql | tee "$log_dir/low"
    test "$(cat "$log_dir/low")" = "$(printf 'GPU-LAST\t1\t2\t1')"

    printf '\nUC12 unchanged physical count (expected: NO_CHANGE, version 0)\n'
    unchanged="SET @sku = 'GPU-LAST', @counted_quantity = 1, @expected_version = 0, @reason = 'Physical stock count';"
    mysql_file uc12-stock-adjustment.sql "$unchanged" | tee "$log_dir/unchanged"
    test "$(cat "$log_dir/unchanged")" = "$(printf 'NO_CHANGE\t0')"

    printf '\nUC12 adjust from 1 to 3 (expected: ADJUSTED, delta 2, version 1)\n'
    adjustment="SET @sku = 'GPU-LAST', @counted_quantity = 3, @expected_version = 0, @reason = 'Physical stock count';"
    mysql_file uc12-stock-adjustment.sql "$adjustment" | tee "$log_dir/adjust"
    test "$(cat "$log_dir/adjust")" = "$(printf 'ADJUSTED\t2\t1')"

    printf '\nUC12 submit an older count (expected: STALE_COUNT)\n'
    mysql_file uc12-stock-adjustment.sql "$adjustment SET @counted_quantity = 5;" | tee "$log_dir/stale"
    test "$(cat "$log_dir/stale")" = "$(printf 'STALE_COUNT\t1')"

    printf '\nUC09 stock history (expected: one adjustment from 1 to 3)\n'
    mysql_file uc09-stock-history.sql "SET @sku = 'GPU-LAST', @from_time = NULL, @to_time = NULL;" | tee "$log_dir/history"
    awk -F '\t' 'END { exit !(NR == 1 && $2 == "GPU-LAST" && $3 == "ADJUSTMENT" && $5 == 1 && $6 == 3 && $7 == 2) }' "$log_dir/history"
    other_history=$(mysql_file uc09-stock-history.sql "SET @sku = 'RAM-AT', @from_time = NULL, @to_time = NULL;")
    low_stock=$(mysql_file uc10-low-stock.sql)
    test -z "$other_history"
    test -z "$low_stock"

    printf '\nUC12 confirm a count captured before a sale (expected: STALE_COUNT)\n'
    new_run
    setup_mysql
    snapshot=$(printf "SELECT quantity, stock_version FROM role_e_stock WHERE run_id = '%s' AND sku = 'GPU-LAST';\n" "$run_id" |
      mysql_lab)
    IFS=$'\t' read -r counted_quantity count_version <<< "$snapshot"
    test "$counted_quantity" = 1
    test "$count_version" = 0
    mysql_file 02-confirm-order.sql "SET @order_id = 'A', @hold_seconds = 0;" | tee "$log_dir/sale"
    test "$(cat "$log_dir/sale")" = "$(printf 'A\tCONFIRMED')"
    stale_count="SET @sku = 'GPU-LAST', @counted_quantity = $counted_quantity, @expected_version = $count_version, @reason = 'Count captured before the sale';"
    mysql_file uc12-stock-adjustment.sql "$stale_count" | tee "$log_dir/stale_sale"
    test "$(cat "$log_dir/stale_sale")" = "$(printf 'STALE_COUNT\t1')"
    verify_mysql
    printf 'PASS\n'
    ;;
esac
