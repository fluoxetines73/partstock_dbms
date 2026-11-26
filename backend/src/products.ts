import { Router } from 'express';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { isId } from './management.js';
import { isObject, managedResourceRouter, requiredText, writeAndRead } from './managed-resource.js';

interface ProductInput {
  sku: string;
  name: string;
  category_id: string;
  brand_id: string;
  specifications?: Record<string, unknown> | null;
  selling_price: number;
}

const productFields = ['sku', 'name', 'category_id', 'brand_id', 'specifications', 'selling_price'] as const;
const productPatchFields = [...productFields, 'status'] as const;
type ProductField = typeof productPatchFields[number];
type ProductPatch = Partial<ProductInput> & { status?: 'DISCONTINUED' };

interface ProductRow extends RowDataPacket {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  brand_id: string;
  specifications: Record<string, unknown> | null;
  selling_price: string;
  low_threshold: number | null;
  status: 'ACTIVE' | 'DISCONTINUED';
}

const productColumns = `CAST(p.id AS CHAR) AS id, p.sku, p.name,
         CAST(p.category_id AS CHAR) AS category_id, CAST(p.brand_id AS CHAR) AS brand_id,
         p.specifications, p.selling_price, p.status`;

async function readProducts(db: Pool | PoolConnection, clause: string, values: string[] = []) {
  try {
    const [rows] = await db.execute<ProductRow[]>(`
      SELECT ${productColumns}, i.low_threshold FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id ${clause}`, values);
    return rows;
  } catch (error) {
    // Support catalog reads before migrations 003 (inventory) and 004 (thresholds).
    const code = (error as { code?: string }).code;
    if (code !== 'ER_NO_SUCH_TABLE' && code !== 'ER_BAD_FIELD_ERROR') throw error;
    const [rows] = await db.execute<ProductRow[]>(`
      SELECT ${productColumns}, NULL AS low_threshold FROM products p ${clause}`, values);
    return rows;
  }
}

function toProduct(row: ProductRow) {
  return { ...row, selling_price: Number(row.selling_price) };
}

function parseProductPatch(body: unknown): ProductPatch | undefined {
  if (!isObject(body)) return;
  const fields = Object.keys(body);
  if (fields.length === 0 || fields.some(field => !productPatchFields.includes(field as ProductField))) return;

  const input: ProductPatch = {};
  for (const field of ['sku', 'name'] as const) {
    if (!Object.hasOwn(body, field)) continue;
    const value = requiredText(body[field], field === 'sku' ? 64 : 150);
    if (value === undefined) return;
    input[field] = value;
  }
  for (const field of ['category_id', 'brand_id'] as const) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (!isId(value)) return;
    input[field] = value;
  }
  if (Object.hasOwn(body, 'selling_price')) {
    const price = body.selling_price;
    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0 || price > 999_999_999_999_999) return;
    input.selling_price = price;
  }
  if (Object.hasOwn(body, 'specifications')) {
    const specifications = body.specifications;
    if (specifications !== null && !isObject(specifications)) return;
    input.specifications = specifications;
  }
  if (Object.hasOwn(body, 'status')) {
    if (body.status !== 'DISCONTINUED') return;
    input.status = body.status;
  }
  return input;
}

function parseProductCreate(body: unknown): ProductInput | undefined {
  const patch = parseProductPatch(body);
  if (!patch || patch.status !== undefined) return;
  const { sku, name, category_id, brand_id, selling_price, specifications } = patch;
  if (sku === undefined || name === undefined || category_id === undefined || brand_id === undefined || selling_price === undefined) return;
  return { sku, name, category_id, brand_id, selling_price, specifications };
}

function productValue(input: ProductPatch, field: ProductField) {
  const value = input[field];
  if (value == null) return null;
  return typeof value === 'object' ? JSON.stringify(value) : value;
}

export function createProductStore(pool: Pool) {
  return {
    async list() {
      const rows = await readProducts(pool, 'ORDER BY p.id');
      return rows.map(toProduct);
    },
    async create(input: ProductInput) {
      return writeAndRead(pool, async connection => {
        await connection.execute(
          'INSERT INTO products (sku, name, category_id, brand_id, specifications, selling_price) VALUES (?, ?, ?, ?, ?, ?)',
          productFields.map(field => productValue(input, field)),
        );
        // F03 Q6: every product has exactly one stock row from the start, so stock updates never need an upsert.
        await connection.execute('INSERT INTO inventory (product_id, quantity_on_hand) VALUES (LAST_INSERT_ID(), 0)');
        const [row] = await readProducts(connection, 'WHERE p.id = LAST_INSERT_ID()');
        return toProduct(row!);
      });
    },
    async setLowThreshold(id: string, lowThreshold: number | null) {
      return writeAndRead(pool, async connection => {
        await connection.execute('UPDATE inventory SET low_threshold = ? WHERE product_id = ?', [lowThreshold, id]);
        const [[row]] = await connection.execute<RowDataPacket[]>(
          'SELECT CAST(product_id AS CHAR) AS product_id, low_threshold FROM inventory WHERE product_id = ?', [id],
        );
        return row ?? null;
      });
    },
    async update(id: string, input: ProductPatch) {
      const fields = productPatchFields.filter(field => input[field] !== undefined);
      return writeAndRead(pool, async connection => {
        await connection.execute(
          `UPDATE products SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
          [...fields.map(field => productValue(input, field)), id],
        );
        const [row] = await readProducts(connection, 'WHERE p.id = ?', [id]);
        return row ? toProduct(row) : null;
      });
    },
  };
}

export function productRouter(store: ReturnType<typeof createProductStore>, managerToken?: string) {
  const routes = Router();
  routes.put('/:id/low-threshold', async (request, response) => {
    const id = request.params.id;
    if (!request.is('application/json')) {
      response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE' } });
      return;
    }
    const body: unknown = request.body;
    if (!isId(id) || !isObject(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'low_threshold')) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    const threshold = body.low_threshold;
    if (threshold !== null && (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 0 || threshold > 2_147_483_647)) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR' } });
      return;
    }
    const result = await store.setLowThreshold(id, threshold);
    if (!result) {
      response.status(404).json({ error: { code: 'NOT_FOUND' } });
      return;
    }
    response.json(result);
  });
  return managedResourceRouter(store, managerToken, parseProductCreate, parseProductPatch, 'SKU_CONFLICT', routes);
}
