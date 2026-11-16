import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { isId, requireAccess, requireManager } from './management.js';

function integer(value: unknown, max: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) > max) {
    throw new RangeError('Invalid numeric filter');
  }
  return Number(value);
}

function date(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function createQueryStore(pool: Pool) {
  return {
    async facets() {
      const [categories] = await pool.execute<RowDataPacket[]>('SELECT CAST(id AS CHAR) AS id, name FROM categories ORDER BY name');
      const [brands] = await pool.execute<RowDataPacket[]>('SELECT CAST(id AS CHAR) AS id, name FROM brands ORDER BY name');
      return { categories, brands };
    },
    async products(filters: Record<string, unknown>) {
      const clauses = ["p.status = 'ACTIVE'"];
      const values: (string | number)[] = [];
      function add(clause: string, value: string | number) {
        clauses.push(clause);
        values.push(value);
      }
      if (filters.q !== undefined) {
        if (typeof filters.q !== 'string' || filters.q.length > 150) throw new RangeError('Invalid search text');
        const term = filters.q.trim().normalize('NFC');
        if (term) {
          clauses.push('(p.sku = ? OR LOCATE(?, p.name) > 0)');
          values.push(term, term);
        }
      }
      for (const key of ['category_id', 'brand_id']) {
        const value = filters[key];
        if (value === undefined) continue;
        if (!isId(value)) throw new RangeError('Invalid category or brand');
        add(key === 'category_id' ? 'p.category_id = ?' : 'p.brand_id = ?', value);
      }
      const limit = filters.limit === undefined ? 25 : integer(filters.limit, 100);
      const offset = filters.offset === undefined ? 0 : integer(filters.offset, 2_147_483_647);
      if (limit === 0) throw new RangeError('Invalid limit');
      const min = filters.min_price === undefined ? 0 : integer(filters.min_price, 999_999_999_999_999);
      const max = filters.max_price === undefined ? 999_999_999_999_999 : integer(filters.max_price, 999_999_999_999_999);
      if (min > max) throw new RangeError('Invalid price range');
      if (filters.min_price !== undefined) add('p.selling_price >= ?', min);
      if (filters.max_price !== undefined) add('p.selling_price <= ?', max);
      if (filters.stock !== undefined && filters.stock !== 'in' && filters.stock !== 'out') {
        throw new RangeError('Invalid stock filter');
      }
      if (filters.never_sold !== undefined && filters.never_sold !== 'true') {
        throw new RangeError('Invalid sales history filter');
      }
      if (filters.never_sold === 'true') {
        clauses.push(`NOT EXISTS (SELECT 1 FROM sales_order_lines l
          JOIN sales_orders o ON o.id = l.order_id
          WHERE l.product_id = p.id AND o.status IN ('CONFIRMED', 'CANCELLED'))`);
      }

      // Catalog search can run on migration 002 while D/E's inventory is pending.
      const [tables] = await pool.execute<RowDataPacket[]>(
        "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventory'",
      );
      const stockAvailable = tables.length > 0;
      if (filters.stock !== undefined && !stockAvailable) return null;
      if (filters.stock === 'in') clauses.push('i.quantity_on_hand > 0');
      if (filters.stock === 'out') clauses.push('i.quantity_on_hand = 0');
      const [items] = await pool.execute<RowDataPacket[]>(`
        SELECT CAST(p.id AS CHAR) AS id, p.sku, p.name,
               CAST(p.category_id AS CHAR) AS category_id, c.name AS category_name,
               CAST(p.brand_id AS CHAR) AS brand_id, b.name AS brand_name,
               CAST(p.selling_price AS CHAR) AS selling_price_vnd,
               ${stockAvailable ? 'i.quantity_on_hand' : 'NULL'} AS quantity_on_hand
        FROM products p JOIN categories c ON c.id = p.category_id
        JOIN brands b ON b.id = p.brand_id
        ${stockAvailable ? 'LEFT JOIN inventory i ON i.product_id = p.id' : ''}
        WHERE ${clauses.join(' AND ')}
        ORDER BY p.id LIMIT ? OFFSET ?`, [...values, limit + 1, offset]);
      return { items: items.slice(0, limit), stock_available: stockAvailable, has_more: items.length > limit };
    },
    async revenue(from: unknown, to: unknown) {
      if (!date(from) || !date(to) || from >= to) throw new RangeError('Invalid date range');
      const [[row]] = await pool.execute<RowDataPacket[]>(`
        SELECT CAST(COALESCE(SUM(l.quantity * l.unit_price), 0) AS CHAR) AS revenue_vnd,
               CAST(COUNT(DISTINCT o.id) AS CHAR) AS order_count
        FROM sales_orders o JOIN sales_order_lines l ON l.order_id = o.id
        WHERE o.status = 'CONFIRMED' AND o.confirmed_at >= ? AND o.confirmed_at < ?`, [from, to]);
      return { from, to, ...row };
    },
  };
}

export function queryRouter(store: ReturnType<typeof createQueryStore>, managerToken?: string, staffToken?: string) {
  const router = Router();
  const requireSearchAccess = requireAccess(managerToken, staffToken);
  router.get('/product-search/facets', requireSearchAccess, async (_req, res) => {
    res.json(await store.facets());
  });
  router.get('/product-search', requireSearchAccess, async (req, res) => {
    const result = await store.products(req.query);
    if (result === null) {
      res.status(503).json({ error: { code: 'STOCK_UNAVAILABLE', message: 'Inventory is not available' } });
      return;
    }
    res.json(result);
  });
  router.get('/revenue', requireManager(managerToken), async (req, res) => {
    res.json(await store.revenue(req.query.from, req.query.to));
  });
  router.use(((error, _req, res, _next) => {
    if (error instanceof RangeError) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
      return;
    }
    const schemaMissing = ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code);
    res.status(schemaMissing ? 503 : 500).json({
      error: { code: schemaMissing ? 'QUERY_SCHEMA_UNAVAILABLE' : 'QUERY_FAILED', message: 'Query unavailable' },
    });
  }) satisfies import('express').ErrorRequestHandler);
  return router;
}
