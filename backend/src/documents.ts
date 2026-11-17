import { json, type ErrorRequestHandler } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { isId } from './management.js';
import { isObject } from './managed-resource.js';

// Business timestamps (confirmed_at, cancelled_at, occurred_at) are stored in Vietnam time (+07:00),
// independent of the MySQL server time zone. See docs/architecture/f03-quy-tac-chung-tu-kho.md.
export const VN_NOW = "CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+07:00')";

export const MAX_LINES = 100;
export const MAX_LINE_QUANTITY = 1_000_000;
const MAX_MONEY = 999_999_999_999_999;
const MAX_ATTEMPTS = 3;

export class DocumentError extends Error {
  constructor(readonly status: number, readonly code: string, readonly details: Record<string, unknown> = {}) {
    super(code);
  }
}

/**
 * Runs `work` in one transaction. A deadlock (1213) rolls everything back and reruns the whole
 * transaction, at most MAX_ATTEMPTS times. Every other error rolls back and is rethrown.
 */
export async function inTransaction<T>(pool: Pool, work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      try {
        const result = await work(connection);
        await connection.commit();
        return result;
      } catch (error) {
        try {
          await connection.rollback();
        } catch {
          // The connection may already be gone; the server rolls back an unfinished transaction itself.
        }
        throw error;
      }
    } catch (error) {
      if (attempt < MAX_ATTEMPTS && (error as { code?: string }).code === 'ER_LOCK_DEADLOCK') continue;
      throw error;
    } finally {
      connection.release();
    }
  }
}

export interface DraftLine {
  product_id: string;
  quantity: number;
  unit_cost?: number;
}

/** Returns undefined when the body is not a valid list of lines; a list may be empty (drafts may be empty). */
export function parseLines(raw: unknown, withCost: boolean): DraftLine[] | undefined {
  if (!Array.isArray(raw) || raw.length > MAX_LINES) return;
  const seen = new Set<string>();
  const lines: DraftLine[] = [];
  for (const item of raw) {
    if (!isObject(item)) return;
    const allowed = withCost ? ['product_id', 'quantity', 'unit_cost'] : ['product_id', 'quantity'];
    if (Object.keys(item).some(key => !allowed.includes(key))) return;
    const { product_id: productId, quantity, unit_cost: unitCost } = item;
    if (!isId(productId) || seen.has(productId)) return;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) return;
    seen.add(productId);
    if (withCost) {
      if (typeof unitCost !== 'number' || !Number.isInteger(unitCost) || unitCost < 0 || unitCost > MAX_MONEY) return;
      lines.push({ product_id: productId, quantity, unit_cost: unitCost });
    } else {
      lines.push({ product_id: productId, quantity });
    }
  }
  return lines;
}

export function optionalText(body: Record<string, unknown>, field: string, maxLength: number): string | null | undefined {
  if (!Object.hasOwn(body, field) || body[field] === null) return null;
  const value = body[field];
  if (typeof value !== 'string') return undefined;
  const text = value.trim().normalize('NFC');
  if ([...text].length > maxLength) return undefined;
  return text === '' ? null : text;
}

export interface ProductRow extends RowDataPacket {
  id: string;
  sku: string;
  status: 'ACTIVE' | 'DISCONTINUED';
  price: string;
}

/** Draft documents may only reference products that exist and are still sold (F03 §1). */
export async function requireActiveProducts(connection: PoolConnection, ids: string[]): Promise<Map<string, ProductRow>> {
  const products = new Map<string, ProductRow>();
  if (ids.length === 0) return products;
  const [rows] = await connection.execute<ProductRow[]>(
    `SELECT CAST(id AS CHAR) AS id, sku, status, CAST(selling_price AS CHAR) AS price
     FROM products WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  for (const row of rows) products.set(row.id, row);
  if (products.size !== ids.length) throw new DocumentError(400, 'INVALID_REFERENCE');
  const discontinued = rows.filter(row => row.status !== 'ACTIVE').map(row => row.sku);
  if (discontinued.length > 0) throw new DocumentError(409, 'PRODUCT_DISCONTINUED', { skus: discontinued });
  return products;
}

/** Explains why a conditional status change touched no row: unknown id (404) or wrong state (409). */
export async function rejectState(
  connection: PoolConnection,
  table: 'purchase_receipts' | 'sales_orders',
  id: string,
  code: string,
): Promise<never> {
  const [rows] = await connection.execute<RowDataPacket[]>(`SELECT status FROM ${table} WHERE id = ?`, [id]);
  if (rows.length === 0) throw new DocumentError(404, 'NOT_FOUND');
  throw new DocumentError(409, code, { status: rows[0]!.status });
}

export type MovementKind =
  | { type: 'IMPORT'; column: 'purchase_receipt_line_id' }
  | { type: 'SALE' | 'SALE_CANCEL'; column: 'sales_order_line_id' };

export async function readStock(connection: PoolConnection, productId: string): Promise<number> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT quantity_on_hand FROM inventory WHERE product_id = ?',
    [productId],
  );
  return rows.length === 0 ? 0 : Number(rows[0]!.quantity_on_hand);
}

/**
 * Applies one signed stock change and appends the matching ledger row, inside the caller's transaction.
 * A decrease is a single conditional UPDATE, so the check and the write are one atomic step on the row lock.
 * Returns false when the decrease would make stock negative (or the inventory row is missing).
 */
export async function moveStock(
  connection: PoolConnection,
  productId: string,
  delta: number,
  kind: MovementKind,
  lineId: string,
  occurredAt: string,
): Promise<boolean> {
  const quantity = Math.abs(delta);
  const [result] = delta > 0
    ? await connection.execute<ResultSetHeader>(
      'UPDATE inventory SET quantity_on_hand = quantity_on_hand + ? WHERE product_id = ?',
      [quantity, productId],
    )
    : await connection.execute<ResultSetHeader>(
      'UPDATE inventory SET quantity_on_hand = quantity_on_hand - ? WHERE product_id = ? AND quantity_on_hand >= ?',
      [quantity, productId, quantity],
    );
  if (result.affectedRows === 0) return false;
  const after = await readStock(connection, productId);
  await connection.execute(
    `INSERT INTO stock_movements (product_id, movement_type, quantity_delta, quantity_after, ${kind.column}, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, kind.type, delta, after, lineId, occurredAt],
  );
  return true;
}

export const jsonBody = json({ limit: '32kb' });

export const documentErrors: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof DocumentError) {
    response.status(error.status).json({ error: { code: error.code, ...error.details } });
  } else if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
    response.status(400).json({ error: { code: 'INVALID_REFERENCE' } });
  } else if (error?.code === 'ER_LOCK_DEADLOCK') {
    response.status(503).json({ error: { code: 'TRANSACTION_RETRY' } });
  } else if (error?.code === 'ER_LOCK_WAIT_TIMEOUT') {
    response.status(503).json({ error: { code: 'LOCK_TIMEOUT' } });
  } else if (error?.code === 'ER_NO_SUCH_TABLE') {
    response.status(503).json({ error: { code: 'SCHEMA_UNAVAILABLE' } });
  } else if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
  } else if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  } else {
    response.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  }
};

export function listOptions(query: Record<string, unknown>): { status?: string; limit: number; offset: number } | undefined {
  const number = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d{1,10}$/.test(value) || Number(value) > max) return undefined;
    return Number(value);
  };
  const limit = number(query.limit, 50, 200);
  const offset = number(query.offset, 0, 2_147_483_647);
  if (limit === undefined || offset === undefined || limit === 0) return;
  if (query.status !== undefined && typeof query.status !== 'string') return;
  return { status: query.status as string | undefined, limit, offset };
}
