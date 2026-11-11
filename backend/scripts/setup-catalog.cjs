// Explicit additive setup only; never called automatically when starting the server.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { loadConfig } = require('../dist/config.js');
async function main() {
  const connection = await mysql.createConnection(loadConfig(process.env).db);
  try {
    const [tables] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('categories', 'brands')");
    if (tables.length) throw new Error('Catalog tables already exist; inspect schema before applying migration');
    const sql = readFileSync(resolve(__dirname, '../../database/mysql/migrations/001_catalogs.sql'), 'utf8').replace(/^--.*$/gm, '');
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
    console.log('PASS: categories and brands created in MySQL app (no seed loaded)');
  } finally { await connection.end(); }
}
main().catch(error => {
  console.error(error.code ? `Setup failed: ${error.code}` : error.message);
  process.exitCode = 1;
});
