import type { Pool, RowDataPacket } from 'mysql2/promise';
import { isObject, managedResourceRouter, requiredText, writeAndRead } from './managed-resource.js';

interface SupplierInput {
  name: string;
  phone?: string | null;
  email?: string | null;
}

const supplierFields = ['name', 'phone', 'email'] as const;
type SupplierField = typeof supplierFields[number];
type SupplierPatch = Partial<SupplierInput>;

interface SupplierRow extends RowDataPacket {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

const selectSuppliers = `
  SELECT CAST(s.id AS CHAR) AS id, s.name, s.phone, s.email
  FROM suppliers AS s`;

function parseSupplierPatch(body: unknown): SupplierPatch | undefined {
  if (!isObject(body)) return;
  const fields = Object.keys(body);
  if (fields.length === 0 || fields.some(field => !supplierFields.includes(field as SupplierField))) return;

  const input: SupplierPatch = {};
  if (Object.hasOwn(body, 'name')) {
    const name = requiredText(body.name, 150);
    if (name === undefined) return;
    input.name = name;
  }
  for (const field of ['phone', 'email'] as const) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (value === null) {
      input[field] = null;
    } else {
      const text = requiredText(value, field === 'phone' ? 32 : 254);
      if (text === undefined) return;
      input[field] = text;
    }
  }
  return input;
}

function parseSupplierCreate(body: unknown): SupplierInput | undefined {
  const patch = parseSupplierPatch(body);
  if (!patch || patch.name === undefined) return;
  return { name: patch.name, phone: patch.phone, email: patch.email };
}

export function createSupplierStore(pool: Pool) {
  return {
    async list() {
      const [rows] = await pool.execute<SupplierRow[]>(`${selectSuppliers} ORDER BY s.id`);
      return rows;
    },
    async create(input: SupplierInput) {
      return writeAndRead(pool, async connection => {
        await connection.execute('INSERT INTO suppliers (name, phone, email) VALUES (?, ?, ?)',
          [input.name, input.phone ?? null, input.email ?? null]);
        const [[row]] = await connection.execute<SupplierRow[]>(`${selectSuppliers} WHERE s.id = LAST_INSERT_ID()`);
        return row!;
      });
    },
    async update(id: string, input: SupplierPatch) {
      const fields = supplierFields.filter(field => input[field] !== undefined);
      return writeAndRead(pool, async connection => {
        await connection.execute(
          `UPDATE suppliers SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
          [...fields.map(field => input[field] ?? null), id],
        );
        const [[row]] = await connection.execute<SupplierRow[]>(`${selectSuppliers} WHERE s.id = ?`, [id]);
        return row ?? null;
      });
    },
  };
}

export function supplierRouter(store: ReturnType<typeof createSupplierStore>, managerToken?: string) {
  return managedResourceRouter(store, managerToken, parseSupplierCreate, parseSupplierPatch);
}
