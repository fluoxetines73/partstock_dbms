import type { Pool, RowDataPacket } from 'mysql2/promise';
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
type ProductField = typeof productFields[number];
type ProductPatch = Partial<ProductInput>;

interface ProductRow extends RowDataPacket {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  brand_id: string;
  specifications: Record<string, unknown> | null;
  selling_price: string;
  status: 'ACTIVE' | 'DISCONTINUED';
}

const selectProducts = `
  SELECT CAST(p.id AS CHAR) AS id, p.sku, p.name,
         CAST(p.category_id AS CHAR) AS category_id, CAST(p.brand_id AS CHAR) AS brand_id,
         p.specifications, p.selling_price, p.status
  FROM products AS p`;

function toProduct(row: ProductRow) {
  return { ...row, selling_price: Number(row.selling_price) };
}

function parseProductPatch(body: unknown): ProductPatch | undefined {
  if (!isObject(body)) return;
  const fields = Object.keys(body);
  if (fields.length === 0 || fields.some(field => !productFields.includes(field as ProductField))) return;

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
  return input;
}

function parseProductCreate(body: unknown): ProductInput | undefined {
  const patch = parseProductPatch(body);
  if (!patch) return;
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
      const [rows] = await pool.execute<ProductRow[]>(`${selectProducts} ORDER BY p.id`);
      return rows.map(toProduct);
    },
    async create(input: ProductInput) {
      return writeAndRead(pool, async connection => {
        await connection.execute(
          'INSERT INTO products (sku, name, category_id, brand_id, specifications, selling_price) VALUES (?, ?, ?, ?, ?, ?)',
          productFields.map(field => productValue(input, field)),
        );
        const [[row]] = await connection.execute<ProductRow[]>(`${selectProducts} WHERE p.id = LAST_INSERT_ID()`);
        return toProduct(row!);
      });
    },
    async update(id: string, input: ProductPatch) {
      const fields = productFields.filter(field => input[field] !== undefined);
      return writeAndRead(pool, async connection => {
        await connection.execute(
          `UPDATE products SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
          [...fields.map(field => productValue(input, field)), id],
        );
        const [[row]] = await connection.execute<ProductRow[]>(`${selectProducts} WHERE p.id = ?`, [id]);
        return row ? toProduct(row) : null;
      });
    },
  };
}

export function productRouter(store: ReturnType<typeof createProductStore>, managerToken?: string) {
  return managedResourceRouter(store, managerToken, parseProductCreate, parseProductPatch, 'SKU_CONFLICT');
}
