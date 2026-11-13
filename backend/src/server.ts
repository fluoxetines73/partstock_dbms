import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db.js';

function main() {
  const config = loadConfig(process.env);
  const database = createDatabase(config.db);
  const app = createApp(() => database.check(), {
    store: database.catalog,
    products: database.products,
    suppliers: database.suppliers,
    managerToken: process.env.APP_MANAGER_TOKEN,
  });
  const server = app.listen(config.port, '127.0.0.1', () => {
    console.log(`PartStock backend: http://127.0.0.1:${config.port}`);
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => {
      database.close().then(() => {
        clearTimeout(timeout);
      }).catch(() => {
        console.error('Database shutdown failed');
        process.exitCode = 1;
      });
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.once('error', () => {
    console.error('HTTP server failed to start');
    process.exitCode = 1;
    shutdown();
  });
}
try {
  main();
} catch (error) {
  // Configuration errors name the missing variable, never its value.
  console.error(error instanceof Error ? error.message : 'Startup failed');
  process.exitCode = 1;
}
