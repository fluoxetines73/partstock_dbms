import express from 'express';
import { catalogRouter, type CatalogStore } from './catalog.js';

export function createApp(checkDatabase: () => Promise<void>, catalog?: { store: CatalogStore; managerToken?: string }) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/ready', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try {
      await checkDatabase();
      response.json({ status: 'ready' });
    } catch {
      response.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Database unavailable' } });
    }
  });
  if (catalog) app.use('/api', catalogRouter(catalog.store, catalog.managerToken));
  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  return app;
}
