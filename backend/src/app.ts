import express from 'express';
import { catalogRouter, type CatalogStore } from './catalog.js';
import { productRouter, type createProductStore } from './products.js';
import { supplierRouter, type createSupplierStore } from './suppliers.js';

interface AppResources {
  store: CatalogStore;
  products?: ReturnType<typeof createProductStore>;
  suppliers?: ReturnType<typeof createSupplierStore>;
  managerToken?: string;
}

export function createApp(checkDatabase: () => Promise<void>, resources?: AppResources) {
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
  if (resources?.products) app.use('/api/products', productRouter(resources.products, resources.managerToken));
  if (resources?.suppliers) app.use('/api/suppliers', supplierRouter(resources.suppliers, resources.managerToken));
  if (resources) app.use('/api', catalogRouter(resources.store, resources.managerToken));
  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  return app;
}
