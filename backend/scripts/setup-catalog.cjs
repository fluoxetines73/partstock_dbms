// Explicit additive setup only; never called automatically when starting the server.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { loadConfig } = require('../dist/config.js');

const migrations = [
  { file: '001_catalogs.sql', tables: ['categories', 'brands'] },
  { file: '002_products_suppliers.sql', tables: ['products', 'suppliers'] },
];

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
    console.log(applied.length ? `PASS: applied ${applied.join(', ')}` : 'PASS: migrations 001 and 002 already applied');
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
