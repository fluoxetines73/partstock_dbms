// Explicit additive setup only; never called automatically when starting the server.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { loadConfig } = require('../dist/config.js');

const migrations = [
  { file: '001_catalogs.sql', tables: ['categories', 'brands'] },
  { file: '002_products_suppliers.sql', tables: ['products', 'suppliers'] },
  {
    file: '003_inventory_documents.sql',
    tables: ['inventory', 'purchase_receipts', 'purchase_receipt_lines', 'sales_orders', 'sales_order_lines', 'stock_movements'],
  },
];

const thresholdMigration = '004_inventory_low_threshold.sql';

async function hasThresholdMigration(connection) {
  const [[column]] = await connection.query(`
    SELECT COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory' AND COLUMN_NAME = 'low_threshold'`);
  if (!column) return false;
  const [[constraint]] = await connection.query(`
    SELECT c.CHECK_CLAUSE FROM information_schema.TABLE_CONSTRAINTS t
    JOIN information_schema.CHECK_CONSTRAINTS c USING (CONSTRAINT_SCHEMA, CONSTRAINT_NAME)
    WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME = 'inventory'
      AND t.CONSTRAINT_NAME = 'chk_inventory_low_threshold' AND t.ENFORCED = 'YES'`);
  const check = constraint?.CHECK_CLAUSE.replace(/[`\s()]/g, '').toLowerCase();
  if (column.COLUMN_TYPE !== 'int' || column.COLUMN_DEFAULT !== null ||
      column.IS_NULLABLE !== 'YES' || check !== 'low_threshold>=0') {
    throw new Error(`Unexpected schema state for ${thresholdMigration}; inspect inventory.low_threshold and its CHECK constraint`);
  }
  return true;
}

async function applyMigrations(connection) {
  const [[{ lockName }]] = await connection.query(
    "SELECT SHA2(CONCAT('partstock:db:setup:', DATABASE()), 256) AS lockName",
  );
  const [[{ acquired }]] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
  if (Number(acquired) !== 1) throw new Error('Could not acquire the migration lock for this schema');

  try {
    const [tables] = await connection.query(
      'SELECT TABLE_NAME, TABLE_TYPE FROM information_schema.TABLES ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)',
      [migrations.flatMap(migration => migration.tables)],
    );
    const tableTypes = new Map(tables.map(table => [table.TABLE_NAME, table.TABLE_TYPE]));
    const pending = [];

    for (const { file, tables: expectedTables } of migrations) {
      const existing = expectedTables.filter(table => tableTypes.has(table));
      if (existing.length === 0) {
        pending.push(file);
      } else if (
        existing.length !== expectedTables.length ||
        existing.some(table => tableTypes.get(table) !== 'BASE TABLE') ||
        pending.length > 0
      ) {
        throw new Error(`Unexpected schema state for ${file}; inspect ${expectedTables.join(', ')} before running setup again`);
      }
    }

    if (!await hasThresholdMigration(connection)) pending.push(thresholdMigration);

    for (const file of pending) {
      const sql = readFileSync(resolve(__dirname, '../../database/mysql/migrations', file), 'utf8');
      const statements = sql.replace(/^--.*$/gm, '').split(';').map(statement => statement.trim()).filter(Boolean);
      try {
        for (const statement of statements) await connection.query(statement);
      } catch (error) {
        throw new Error(`Could not apply ${file} (${error.code ?? error.message}); inspect the schema before running setup again`);
      }
    }
    return pending;
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
  }
}

async function main() {
  const connection = await mysql.createConnection(loadConfig(process.env).db);
  try {
    const applied = await applyMigrations(connection);
    console.log(applied.length ? `PASS: applied ${applied.join(', ')}` : 'PASS: migrations 001–004 already applied');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(`Setup failed: ${error.code ?? error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { applyMigrations };
