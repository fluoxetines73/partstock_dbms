import { timingSafeEqual } from 'node:crypto';
import { Router, json, type ErrorRequestHandler } from 'express';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type CatalogTable = 'categories' | 'brands';
export interface CatalogItem { id: string; name: string }
export interface CatalogStore {
  list(table: CatalogTable): Promise<CatalogItem[]>;
  create(table: CatalogTable, name: string): Promise<CatalogItem>;
  rename(table: CatalogTable, id: string, name: string): Promise<CatalogItem | null>;
  remove(table: CatalogTable, id: string): Promise<boolean>;
}
// Table names come exclusively from this allowlist, never from request values.
function tableName(table: CatalogTable): string {
  if (table !== 'categories' && table !== 'brands') throw new Error('Invalid catalog table');
  return table;
}
export function createCatalogStore(pool: Pool): CatalogStore {
  return {
    async list(table) {
      const [rows] = await pool.execute<RowDataPacket[]>(`SELECT CAST(id AS CHAR) AS id, name FROM ${tableName(table)} ORDER BY id`);
      return rows.map(row => ({ id: row.id as string, name: row.name as string }));
    },
    async create(table, name) {
      // LAST_INSERT_ID is cast inside SQL, so large IDs never pass through JS numbers.
      const connection = await pool.getConnection();
      try {
        await connection.execute(`INSERT INTO ${tableName(table)} (name) VALUES (?)`, [name]);
        const [rows] = await connection.query<RowDataPacket[]>('SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id');
        return { id: rows[0]!.id as string, name };
      } finally { connection.release(); }
    },
    async rename(table, id, name) {
      const [result] = await pool.execute<ResultSetHeader>(`UPDATE ${tableName(table)} SET name = ? WHERE id = ?`, [name, id]);
      return result.affectedRows ? { id, name } : null;
    },
    async remove(table, id) {
      const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM ${tableName(table)} WHERE id = ?`, [id]);
      return result.affectedRows > 0;
    },
  };
}
export function catalogRouter(store: CatalogStore, managerToken?: string) {
  const router = Router();
  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!managerToken || managerToken.trim() === '') {
      response.status(503).json({ error: { code: 'AUTH_NOT_CONFIGURED', message: 'Manager access is not configured' } }); return;
    }
    const header = request.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Manager token required' } }); return;
    }
    const supplied = Buffer.from(header.slice(7));
    const expected = Buffer.from(managerToken);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }); return;
    }
    next();
  });
  router.use(json({ limit: '8kb' }));
  const validName = (body: unknown): string | null => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const record = body as Record<string, unknown>;
    if (Object.keys(record).length !== 1 || typeof record.name !== 'string') return null;
    const name = record.name.trim().normalize('NFC');
    return [...name].length >= 1 && [...name].length <= 100 ? name : null;
  };
  for (const table of ['categories', 'brands'] as const) {
    router.get(`/${table}`, async (_req, res) => { res.json(await store.list(table)); });
    router.post(`/${table}`, async (req, res) => {
      if (!req.is('application/json')) { res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
      const name = validName(req.body);
      if (name === null) { res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
      res.status(201).json(await store.create(table, name));
    });
    router.route(`/${table}/:id`).all((req, res, next) => {
      const id = req.params.id as string;
      if (!/^[1-9]\d{0,19}$/.test(id) || BigInt(id) > 18446744073709551615n) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return;
      }
      next();
    }).patch(async (req, res) => {
      if (!req.is('application/json')) { res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
      const name = validName(req.body);
      if (name === null) { res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
      const item = await store.rename(table, req.params.id as string, name);
      if (!item) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
      res.json(item);
    }).delete(async (req, res) => {
      if (!await store.remove(table, req.params.id as string)) { res.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
      res.status(204).end();
    });
  }
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const code = error?.code;
    if (code === 'ER_DUP_ENTRY') { res.status(409).json({ error: { code: 'NAME_CONFLICT' } }); return; }
    if (code === 'ER_ROW_IS_REFERENCED_2') { res.status(409).json({ error: { code: 'RESOURCE_IN_USE' } }); return; }
    if (error?.type === 'entity.parse.failed') { res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }); return; }
    if (error?.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE' } }); return; }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  };
  router.use(onError);
  return router;
}
