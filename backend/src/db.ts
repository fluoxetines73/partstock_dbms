import { createCatalogStore } from './catalog.js';
import { createPool, type PoolOptions } from 'mysql2/promise';

export function createDatabase(options: PoolOptions) {
  const pool = createPool(options);
  return {
    catalog: createCatalogStore(pool),
    async check(): Promise<void> {
      await pool.query('SELECT 1');
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
