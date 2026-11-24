'use strict';
const { demoSku, validCount, validThreshold, requirePeriod, businessFailure } = require('../stock-ucs/cases.js');

// `db` is one connection for the whole snapshot / transaction.
function reads(db) {
  return {
    async history(sku, from, to, kind = null) {
      requirePeriod(from,to);
      const [totals] = await db.rows(`
        SELECT COALESCE(SUM(CASE WHEN m.occurred_at < ? THEN m.quantity_delta ELSE 0 END),0) AS opening_qty,
               COALESCE(SUM(m.quantity_delta),0) AS closing_qty
        FROM products p LEFT JOIN stock_movements m ON m.product_id=p.id AND m.occurred_at < ?
        WHERE p.sku=?`, [from,to,sku]);
      const moves = await db.rows(`
        SELECT m.movement_type AS kind, m.quantity_delta AS delta, m.quantity_after AS after_qty,
               COALESCE(pr.code, so.code, cl.count_code) AS source_code, m.reason
        FROM products p JOIN stock_movements m ON m.product_id=p.id
        LEFT JOIN purchase_receipt_lines pl ON pl.id=m.purchase_receipt_line_id
        LEFT JOIN purchase_receipts pr ON pr.id=pl.receipt_id
        LEFT JOIN sales_order_lines sl ON sl.id=m.sales_order_line_id
        LEFT JOIN sales_orders so ON so.id=sl.order_id
        LEFT JOIN e_count_lines cl ON cl.id=m.stock_count_line_id AND cl.product_id=m.product_id
        WHERE p.sku=? AND m.occurred_at>=? AND m.occurred_at<? AND (? IS NULL OR m.movement_type=?)
        ORDER BY m.occurred_at,m.id`, [sku,from,to,kind,kind]);
      return { opening: Number(totals.opening_qty), closing: Number(totals.closing_qty),
        rows: moves.map(m => ({ kind: m.kind, delta: Number(m.delta), after: Number(m.after_qty), source: m.source_code, reason: m.reason })) };
    },
    async threshold(sku) {
      const [t] = await db.rows(`
        SELECT i.quantity_on_hand AS q, i.low_threshold AS lim,
          CASE WHEN i.low_threshold IS NULL THEN 'UNCONFIGURED'
            WHEN i.quantity_on_hand < i.low_threshold THEN 'LOW' ELSE 'OK' END AS state
        FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.sku=?`, [sku]);
      return { quantity: Number(t.q), limit: t.lim === null ? null : Number(t.lim), state: t.state };
    },
    async lowList() {
      const rows = await db.rows(`SELECT p.sku,i.quantity_on_hand AS q,i.low_threshold AS lim,
        i.low_threshold-i.quantity_on_hand AS shortage FROM products p JOIN inventory i ON i.product_id=p.id
        WHERE i.quantity_on_hand < i.low_threshold ORDER BY shortage DESC,p.sku`);
      return rows.map(r => [r.sku, Number(r.q), Number(r.lim), Number(r.shortage)]);
    },
    async countState(code) {
      const [c] = await db.rows('SELECT status FROM e_counts WHERE code=?', [code]);
      return c?.status ?? null;
    },
    async mismatches() {
      const rows = await db.rows(`SELECT p.sku FROM products p LEFT JOIN inventory i ON i.product_id=p.id
        LEFT JOIN stock_movements m ON m.product_id=p.id GROUP BY p.sku,i.quantity_on_hand
        HAVING i.quantity_on_hand IS NULL OR i.quantity_on_hand<0 OR i.quantity_on_hand<>COALESCE(SUM(m.quantity_delta),0)
        ORDER BY p.sku`);
      return rows.map(row => row.sku);
    },
  };
}

function stockOperations(context) {
  return {
    read: fn => context.read(db => fn(reads(db))),
    async setThreshold(sku,n) {
      if (!validThreshold(n)) throw businessFailure('INVALID_THRESHOLD');
      return context.write(db=>db.change('UPDATE inventory SET low_threshold=? WHERE product_id=(SELECT id FROM products WHERE sku=?)',[n,sku]));
    },
    async openCount(code,counted,reason) {
      if (!validCount(counted,reason)) return 'INVALID_COUNT';
      return context.write(async db => {
        await db.change("INSERT INTO e_counts(code,status,reason) VALUES (?,'DRAFT',?)", [code,reason.trim()]);
        const added = await db.change(`INSERT INTO e_count_lines(count_code,product_id,system_qty,counted_qty,captured_revision)
          SELECT ?,i.product_id,i.quantity_on_hand,?,i.count_revision FROM inventory i
          JOIN products p ON p.id=i.product_id WHERE p.sku=?`, [code,counted,demoSku]);
        if (added !== 1) throw new Error('Missing inventory for ' + demoSku);
        return 'DRAFT';
      });
    },
    async confirmCount(code,hooks = {}) {
      try {
        return await context.write(async db => {
          if (hooks.started) await hooks.started();
          const changed = await db.change("UPDATE e_counts SET status='CONFIRMED' WHERE code=? AND status='DRAFT'", [code]);
          if (!changed) {
            const state = await reads(db).countState(code);
            if (state !== 'CONFIRMED') throw new Error('Unknown count ' + code);
            return 'ALREADY_CONFIRMED';
          }
          const [line] = await db.rows(`SELECT l.id,l.product_id,l.captured_revision,l.counted_qty-l.system_qty AS delta,h.reason
            FROM e_count_lines l JOIN e_counts h ON h.code=l.count_code WHERE h.code=?`, [code]);
          const delta = Number(line.delta);
          // Take the row lock before inspecting the revision and current stock.
          const [stock] = await db.rows('SELECT quantity_on_hand,count_revision FROM inventory WHERE product_id=?' + context.lock,
            [line.product_id]);
          if (Number(stock.count_revision) !== Number(line.captured_revision)) throw businessFailure('COUNT_SUPERSEDED');
          const after = Number(stock.quantity_on_hand) + delta;
          if (after < 0) throw businessFailure('NEGATIVE_STOCK');
          await db.change('UPDATE inventory SET quantity_on_hand=?,count_revision=count_revision+1 WHERE product_id=?',
            [after,line.product_id]);
          if (hooks.fault) throw businessFailure('FAULT_INJECTED');
          if (delta !== 0) {
            await db.change(`INSERT INTO stock_movements(product_id,movement_type,quantity_delta,quantity_after,
              stock_count_line_id,reason,occurred_at) VALUES (?,'ADJUSTMENT',?,?,?,?,${context.now})`,
              [line.product_id,delta,after,line.id,line.reason]);
          }
          if (hooks.staged) await hooks.staged();
          return delta === 0 ? 'NO_CHANGE' : 'ADJUSTED';
        });
      } catch (error) {
        if (error.stockCaseCode) return error.stockCaseCode;
        throw error;
      }
    },
  };
}
module.exports = { stockOperations };
