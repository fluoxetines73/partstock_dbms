import { Router, json, type ErrorRequestHandler } from 'express';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { isId, requireManager } from './management.js';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requiredText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return;
  const text = value.trim().normalize('NFC');
  if (text.length > 0 && [...text].length <= maxLength) return text;
}

export async function writeAndRead<T>(pool: Pool, write: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    try {
      const result = await write(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    connection.release();
  }
}

interface ResourceStore<Create, Patch, Item> {
  list(): Promise<Item[]>;
  create(input: Create): Promise<Item>;
  update(id: string, input: Patch): Promise<Item | null>;
}

export function managedResourceRouter<Create, Patch, Item>(
  store: ResourceStore<Create, Patch, Item>,
  managerToken: string | undefined,
  parseCreate: (body: unknown) => Create | undefined,
  parsePatch: (body: unknown) => Patch | undefined,
  conflictCode?: string,
) {
  const router = Router();
  router.use(requireManager(managerToken));
  router.use(json({ limit: '8kb' }));
  router.get('/', async (_request, response) => {
    response.json(await store.list());
  });
  router.post('/', async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } });
      return;
    }
    const input = parseCreate(request.body);
    if (!input) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    response.status(201).json(await store.create(input));
  });
  router.patch('/:id', async (request, response) => {
    const id = request.params.id;
    if (!isId(id)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } });
      return;
    }
    const input = parsePatch(request.body);
    if (!input) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    const item = await store.update(id, input);
    if (!item) {
      response.status(404).json({ error: { code: 'NOT_FOUND' } });
      return;
    }
    response.json(item);
  });
  const onError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error?.code === 'ER_DUP_ENTRY' && conflictCode) {
      response.status(409).json({ error: { code: conflictCode } });
    } else if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      response.status(400).json({ error: { code: 'INVALID_REFERENCE' } });
    } else if (error?.type === 'entity.parse.failed') {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
    } else if (error?.type === 'entity.too.large') {
      response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE' } });
    } else {
      response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
    }
  };
  router.use(onError);
  return router;
}
