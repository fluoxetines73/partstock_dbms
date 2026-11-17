import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  DocumentError, VN_NOW, documentErrors, inTransaction, jsonBody, listOptions, moveStock,
  optionalText, parseLines, readStock, rejectState, requireActiveProducts, type DraftLine,
} from './documents.js';
import { isId, requireAccess, requireManager } from './management.js';
import { isObject, requiredText } from './managed-resource.js';

interface OrderInput {
  customer_name: string | null;
  note: string | null;
  lines: DraftLine[];
}

const selectOrders = `
  SELECT CAST(o.id AS CHAR) AS id, o.code, o.status, o.customer_name, o.note,
         CAST(o.created_at AS CHAR) AS created_at, CAST(o.confirmed_at AS CHAR) AS confirmed_at,
         CAST(o.cancelled_at AS CHAR) AS cancelled_at, o.cancel_reason,
         (SELECT COUNT(*) FROM sales_order_lines l WHERE l.order_id = o.id) AS line_count,
         CAST(COALESCE((SELECT SUM(l.quantity * l.unit_price) FROM sales_order_lines l WHERE l.order_id = o.id), 0) AS CHAR) AS total_vnd
  FROM sales_orders o`;

function toOrder(row: RowDataPacket) {
  return { ...row, line_count: Number(row.line_count) };
}

export function parseOrder(body: unknown): OrderInput | undefined {
  if (!isObject(body) || Object.keys(body).some(key => !['customer_name', 'note', 'lines'].includes(key))) return;
  const customer = optionalText(body, 'customer_name', 150);
  const note = optionalText(body, 'note', 500);
  const lines = parseLines(body.lines ?? [], false);
  if (customer === undefined || note === undefined || lines === undefined) return;
  return { customer_name: customer, note, lines };
}

export function parseCancel(body: unknown): string | undefined {
  if (!isObject(body) || Object.keys(body).some(key => key !== 'reason')) return;
  return requiredText(body.reason, 500);
}

/** Draft lines carry a provisional price; the price is fixed from the product when the order is confirmed. */
async function writeLines(connection: PoolConnection, orderId: string, lines: DraftLine[]) {
  const products = await requireActiveProducts(connection, lines.map(line => line.product_id));
  for (const line of lines) {
    await connection.execute(
      'INSERT INTO sales_order_lines (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [orderId, line.product_id, line.quantity, products.get(line.product_id)!.price],
    );
  }
}

export function createSalesStore(pool: Pool) {
  async function get(id: string, connection?: PoolConnection) {
    const executor = connection ?? pool;
    const [rows] = await executor.execute<RowDataPacket[]>(`${selectOrders} WHERE o.id = ?`, [id]);
    if (rows.length === 0) return null;
    const [lines] = await executor.execute<RowDataPacket[]>(
      `SELECT CAST(l.id AS CHAR) AS id, CAST(l.product_id AS CHAR) AS product_id, p.sku, p.name, l.quantity,
              CAST(l.unit_price AS CHAR) AS unit_price_vnd
       FROM sales_order_lines l JOIN products p ON p.id = l.product_id
       WHERE l.order_id = ? ORDER BY l.id`,
      [id],
    );
    return { ...toOrder(rows[0]!), lines };
  }

  return {
    get,
    async list(options: { status?: string; limit: number; offset: number }) {
      const where = options.status ? 'WHERE o.status = ?' : '';
      const [rows] = await pool.execute<RowDataPacket[]>(
        `${selectOrders} ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
        [...(options.status ? [options.status] : []), options.limit, options.offset],
      );
      return rows.map(toOrder);
    },
    async create(input: OrderInput) {
      return inTransaction(pool, async connection => {
        const [header] = await connection.execute<ResultSetHeader>(
          'INSERT INTO sales_orders (code, customer_name, note) VALUES (CONCAT(\'TMP\', UUID_SHORT()), ?, ?)',
          [input.customer_name, input.note],
        );
        const id = String(header.insertId);
        await connection.execute(
          `UPDATE sales_orders SET code = CONCAT('DB-', DATE_FORMAT(${VN_NOW}, '%Y%m%d'), '-', LPAD(id, 6, '0')) WHERE id = ?`,
          [id],
        );
        await writeLines(connection, id, input.lines);
        return (await get(id, connection))!;
      });
    },
    async replaceDraft(id: string, input: OrderInput) {
      return inTransaction(pool, async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>('SELECT status FROM sales_orders WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new DocumentError(404, 'NOT_FOUND');
        if (rows[0]!.status !== 'DRAFT') throw new DocumentError(409, 'ORDER_NOT_DRAFT', { status: rows[0]!.status });
        await connection.execute('UPDATE sales_orders SET customer_name = ?, note = ? WHERE id = ?', [input.customer_name, input.note, id]);
        await connection.execute('DELETE FROM sales_order_lines WHERE order_id = ?', [id]);
        await writeLines(connection, id, input.lines);
        return (await get(id, connection))!;
      });
    },
    async removeDraft(id: string) {
      await inTransaction(pool, async connection => {
        const [result] = await connection.execute<ResultSetHeader>(
          "DELETE FROM sales_orders WHERE id = ? AND status = 'DRAFT'",
          [id],
        );
        if (result.affectedRows === 0) await rejectState(connection, 'sales_orders', id, 'ORDER_NOT_DRAFT');
      });
    },
    /**
     * F03 §3. The conditional status UPDATE takes the order's row lock, so two confirms of one order are
     * serialised and the loser sees ORDER_NOT_DRAFT. Each stock decrease is one conditional UPDATE
     * (quantity_on_hand >= q): the check and the write cannot be separated by another session.
     * Lines are processed by ascending product_id so concurrent orders lock stock rows in the same order.
     */
    async confirm(id: string) {
      return inTransaction(pool, async connection => {
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE sales_orders SET status = 'CONFIRMED', confirmed_at = ${VN_NOW} WHERE id = ? AND status = 'DRAFT'`,
          [id],
        );
        if (result.affectedRows === 0) await rejectState(connection, 'sales_orders', id, 'ORDER_NOT_DRAFT');
        const [[stamp]] = await connection.execute<RowDataPacket[]>(
          'SELECT CAST(confirmed_at AS CHAR) AS at FROM sales_orders WHERE id = ?',
          [id],
        );
        const [lines] = await connection.execute<RowDataPacket[]>(
          `SELECT CAST(l.id AS CHAR) AS id, CAST(l.product_id AS CHAR) AS product_id, l.quantity, p.sku, p.status,
                  CAST(p.selling_price AS CHAR) AS price
           FROM sales_order_lines l JOIN products p ON p.id = l.product_id
           WHERE l.order_id = ? ORDER BY l.product_id FOR SHARE OF p`,
          [id],
        );
        if (lines.length === 0) throw new DocumentError(409, 'EMPTY_DOCUMENT');
        const discontinued = lines.filter(line => line.status !== 'ACTIVE').map(line => line.sku);
        if (discontinued.length > 0) throw new DocumentError(409, 'PRODUCT_DISCONTINUED', { skus: discontinued });
        for (const line of lines) {
          const moved = await moveStock(
            connection, line.product_id, -line.quantity,
            { type: 'SALE', column: 'sales_order_line_id' }, line.id, stamp!.at,
          );
          if (!moved) {
            throw new DocumentError(409, 'INSUFFICIENT_STOCK', {
              sku: line.sku, requested: line.quantity, available: await readStock(connection, line.product_id),
            });
          }
          await connection.execute('UPDATE sales_order_lines SET unit_price = ? WHERE id = ?', [line.price, line.id]);
        }
        return (await get(id, connection))!;
      });
    },
    /** F03 §3. Cancelling restores every line once; the UNIQUE (movement_type, line) key is the second guard. */
    async cancel(id: string, reason: string) {
      return inTransaction(pool, async connection => {
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE sales_orders SET status = 'CANCELLED', cancelled_at = ${VN_NOW}, cancel_reason = ?
           WHERE id = ? AND status = 'CONFIRMED'`,
          [reason, id],
        );
        if (result.affectedRows === 0) await rejectState(connection, 'sales_orders', id, 'ORDER_NOT_CANCELLABLE');
        const [[stamp]] = await connection.execute<RowDataPacket[]>(
          'SELECT CAST(cancelled_at AS CHAR) AS at FROM sales_orders WHERE id = ?',
          [id],
        );
        const [lines] = await connection.execute<RowDataPacket[]>(
          `SELECT CAST(id AS CHAR) AS id, CAST(product_id AS CHAR) AS product_id, quantity
           FROM sales_order_lines WHERE order_id = ? ORDER BY product_id`,
          [id],
        );
        for (const line of lines) {
          const moved = await moveStock(
            connection, line.product_id, line.quantity,
            { type: 'SALE_CANCEL', column: 'sales_order_line_id' }, line.id, stamp!.at,
          );
          if (!moved) throw new DocumentError(409, 'INVENTORY_MISSING', { product_id: line.product_id });
        }
        return (await get(id, connection))!;
      });
    },
  };
}

export function salesRouter(store: ReturnType<typeof createSalesStore>, managerToken?: string, staffToken?: string) {
  const router = Router();
  router.use(requireAccess(managerToken, staffToken));
  router.use(jsonBody);
  const invalid = { error: { code: 'VALIDATION_ERROR' } };
  const writable = (request: { is(type: string): unknown }) => Boolean(request.is('application/json'));

  router.get('/', async (request, response) => {
    const options = listOptions(request.query);
    if (!options || (options.status !== undefined && !['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(options.status))) {
      response.status(400).json(invalid);
      return;
    }
    response.json(await store.list(options));
  });
  router.get('/:id', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    const order = await store.get(request.params.id);
    if (!order) { response.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    response.json(order);
  });
  router.post('/', async (request, response) => {
    if (!writable(request)) { response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
    const input = parseOrder(request.body);
    if (!input) { response.status(400).json(invalid); return; }
    response.status(201).json(await store.create(input));
  });
  router.put('/:id', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    if (!writable(request)) { response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
    const input = parseOrder(request.body);
    if (!input) { response.status(400).json(invalid); return; }
    response.json(await store.replaceDraft(request.params.id, input));
  });
  router.post('/:id/confirm', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    response.json(await store.confirm(request.params.id));
  });
  // UC08 is a Manager-only action (docs/architecture/use-cases.md).
  router.post('/:id/cancel', requireManager(managerToken), async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    if (!writable(request)) { response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
    const reason = parseCancel(request.body);
    if (reason === undefined) { response.status(400).json(invalid); return; }
    response.json(await store.cancel(request.params.id, reason));
  });
  router.delete('/:id', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    await store.removeDraft(request.params.id);
    response.status(204).end();
  });
  router.use(documentErrors);
  return router;
}
