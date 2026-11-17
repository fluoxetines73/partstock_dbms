import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  DocumentError, VN_NOW, documentErrors, inTransaction, jsonBody, listOptions, moveStock,
  optionalText, parseLines, rejectState, requireActiveProducts, type DraftLine,
} from './documents.js';
import { isId, requireAccess } from './management.js';
import { isObject } from './managed-resource.js';

interface ReceiptInput {
  supplier_id: string;
  note: string | null;
  lines: DraftLine[];
}

const selectReceipts = `
  SELECT CAST(r.id AS CHAR) AS id, r.code, CAST(r.supplier_id AS CHAR) AS supplier_id, s.name AS supplier_name,
         r.status, r.note, CAST(r.created_at AS CHAR) AS created_at, CAST(r.confirmed_at AS CHAR) AS confirmed_at,
         (SELECT COUNT(*) FROM purchase_receipt_lines l WHERE l.receipt_id = r.id) AS line_count,
         CAST(COALESCE((SELECT SUM(l.quantity * l.unit_cost) FROM purchase_receipt_lines l WHERE l.receipt_id = r.id), 0) AS CHAR) AS total_cost_vnd
  FROM purchase_receipts r JOIN suppliers s ON s.id = r.supplier_id`;

function toReceipt(row: RowDataPacket) {
  return { ...row, line_count: Number(row.line_count) };
}

export function parseReceipt(body: unknown): ReceiptInput | undefined {
  if (!isObject(body) || Object.keys(body).some(key => !['supplier_id', 'note', 'lines'].includes(key))) return;
  if (!isId(body.supplier_id)) return;
  const note = optionalText(body, 'note', 500);
  const lines = parseLines(body.lines ?? [], true);
  if (note === undefined || lines === undefined) return;
  return { supplier_id: body.supplier_id, note, lines };
}

async function writeLines(connection: PoolConnection, receiptId: string, lines: DraftLine[]) {
  await requireActiveProducts(connection, lines.map(line => line.product_id));
  for (const line of lines) {
    await connection.execute(
      'INSERT INTO purchase_receipt_lines (receipt_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
      [receiptId, line.product_id, line.quantity, line.unit_cost!],
    );
  }
}

export function createPurchaseStore(pool: Pool) {
  async function get(id: string, connection?: PoolConnection) {
    const executor = connection ?? pool;
    const [rows] = await executor.execute<RowDataPacket[]>(`${selectReceipts} WHERE r.id = ?`, [id]);
    if (rows.length === 0) return null;
    const [lines] = await executor.execute<RowDataPacket[]>(
      `SELECT CAST(l.id AS CHAR) AS id, CAST(l.product_id AS CHAR) AS product_id, p.sku, p.name, l.quantity,
              CAST(l.unit_cost AS CHAR) AS unit_cost_vnd
       FROM purchase_receipt_lines l JOIN products p ON p.id = l.product_id
       WHERE l.receipt_id = ? ORDER BY l.id`,
      [id],
    );
    return { ...toReceipt(rows[0]!), lines };
  }

  return {
    get,
    async list(options: { status?: string; limit: number; offset: number }) {
      const where = options.status ? 'WHERE r.status = ?' : '';
      const [rows] = await pool.execute<RowDataPacket[]>(
        `${selectReceipts} ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
        [...(options.status ? [options.status] : []), options.limit, options.offset],
      );
      return rows.map(toReceipt);
    },
    async suppliers() {
      const [rows] = await pool.execute<RowDataPacket[]>('SELECT CAST(id AS CHAR) AS id, name FROM suppliers ORDER BY name, id');
      return rows;
    },
    async create(input: ReceiptInput) {
      return inTransaction(pool, async connection => {
        const [header] = await connection.execute<ResultSetHeader>(
          'INSERT INTO purchase_receipts (code, supplier_id, note) VALUES (CONCAT(\'TMP\', UUID_SHORT()), ?, ?)',
          [input.supplier_id, input.note],
        );
        const id = String(header.insertId);
        await connection.execute(
          `UPDATE purchase_receipts SET code = CONCAT('PN-', DATE_FORMAT(${VN_NOW}, '%Y%m%d'), '-', LPAD(id, 6, '0')) WHERE id = ?`,
          [id],
        );
        await writeLines(connection, id, input.lines);
        return (await get(id, connection))!;
      });
    },
    /** Replaces supplier, note and every line of a draft. The header row lock serialises it with confirm/delete. */
    async replaceDraft(id: string, input: ReceiptInput) {
      return inTransaction(pool, async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>('SELECT status FROM purchase_receipts WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new DocumentError(404, 'NOT_FOUND');
        if (rows[0]!.status !== 'DRAFT') throw new DocumentError(409, 'RECEIPT_NOT_DRAFT', { status: rows[0]!.status });
        await connection.execute('UPDATE purchase_receipts SET supplier_id = ?, note = ? WHERE id = ?', [input.supplier_id, input.note, id]);
        await connection.execute('DELETE FROM purchase_receipt_lines WHERE receipt_id = ?', [id]);
        await writeLines(connection, id, input.lines);
        return (await get(id, connection))!;
      });
    },
    async removeDraft(id: string) {
      await inTransaction(pool, async connection => {
        const [result] = await connection.execute<ResultSetHeader>(
          "DELETE FROM purchase_receipts WHERE id = ? AND status = 'DRAFT'",
          [id],
        );
        if (result.affectedRows === 0) await rejectState(connection, 'purchase_receipts', id, 'RECEIPT_NOT_DRAFT');
      });
    },
    /** F03 §3: one transaction covers the status change, every stock increase and every ledger row. */
    async confirm(id: string) {
      return inTransaction(pool, async connection => {
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE purchase_receipts SET status = 'CONFIRMED', confirmed_at = ${VN_NOW} WHERE id = ? AND status = 'DRAFT'`,
          [id],
        );
        if (result.affectedRows === 0) await rejectState(connection, 'purchase_receipts', id, 'RECEIPT_NOT_DRAFT');
        const [[stamp]] = await connection.execute<RowDataPacket[]>(
          'SELECT CAST(confirmed_at AS CHAR) AS at FROM purchase_receipts WHERE id = ?',
          [id],
        );
        const [lines] = await connection.execute<RowDataPacket[]>(
          `SELECT CAST(l.id AS CHAR) AS id, CAST(l.product_id AS CHAR) AS product_id, l.quantity, p.sku, p.status
           FROM purchase_receipt_lines l JOIN products p ON p.id = l.product_id
           WHERE l.receipt_id = ? ORDER BY l.product_id FOR SHARE OF p`,
          [id],
        );
        if (lines.length === 0) throw new DocumentError(409, 'EMPTY_DOCUMENT');
        const discontinued = lines.filter(line => line.status !== 'ACTIVE').map(line => line.sku);
        if (discontinued.length > 0) throw new DocumentError(409, 'PRODUCT_DISCONTINUED', { skus: discontinued });
        for (const line of lines) {
          const moved = await moveStock(
            connection, line.product_id, line.quantity,
            { type: 'IMPORT', column: 'purchase_receipt_line_id' }, line.id, stamp!.at,
          );
          if (!moved) throw new DocumentError(409, 'INVENTORY_MISSING', { sku: line.sku });
        }
        return (await get(id, connection))!;
      });
    },
  };
}

export function purchaseRouter(store: ReturnType<typeof createPurchaseStore>, managerToken?: string, staffToken?: string) {
  const router = Router();
  router.use(requireAccess(managerToken, staffToken));
  router.use(jsonBody);
  const invalid = { error: { code: 'VALIDATION_ERROR' } };
  const writable = (request: { is(type: string): unknown }) => Boolean(request.is('application/json'));

  router.get('/', async (request, response) => {
    const options = listOptions(request.query);
    if (!options || (options.status !== undefined && !['DRAFT', 'CONFIRMED'].includes(options.status))) {
      response.status(400).json(invalid);
      return;
    }
    response.json(await store.list(options));
  });
  router.get('/suppliers', async (_request, response) => {
    response.json(await store.suppliers());
  });
  router.get('/:id', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    const receipt = await store.get(request.params.id);
    if (!receipt) { response.status(404).json({ error: { code: 'NOT_FOUND' } }); return; }
    response.json(receipt);
  });
  router.post('/', async (request, response) => {
    if (!writable(request)) { response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
    const input = parseReceipt(request.body);
    if (!input) { response.status(400).json(invalid); return; }
    response.status(201).json(await store.create(input));
  });
  router.put('/:id', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    if (!writable(request)) { response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } }); return; }
    const input = parseReceipt(request.body);
    if (!input) { response.status(400).json(invalid); return; }
    response.json(await store.replaceDraft(request.params.id, input));
  });
  router.post('/:id/confirm', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    response.json(await store.confirm(request.params.id));
  });
  router.delete('/:id', async (request, response) => {
    if (!isId(request.params.id)) { response.status(400).json(invalid); return; }
    await store.removeDraft(request.params.id);
    response.status(204).end();
  });
  router.use(documentErrors);
  return router;
}
