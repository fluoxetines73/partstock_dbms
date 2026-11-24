'use strict';
const { DatabaseSync } = require('node:sqlite');
const { Worker } = require('node:worker_threads');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { demoSku, runStockCases } = require('./cases.js');
const { stockOperations } = require('../mysql/stock-operations.cjs');
const fixture = require('./fixture.json');

function seed(db) {
  for (const [sku,q] of fixture.products) {
    const id = db.prepare('INSERT INTO products(sku) VALUES(?)').run(sku).lastInsertRowid;
    db.prepare('INSERT INTO inventory(product_id,quantity_on_hand) VALUES(?,?)').run(id,q);
  }
  for (const [sku,kind,delta,after,code,at] of fixture.movements) {
    const product = db.prepare('SELECT id FROM products WHERE sku=?').get(sku).id;
    let receiptLine=null, orderLine=null;
    if (kind==='IMPORT') {
      db.prepare('INSERT OR IGNORE INTO purchase_receipts(code) VALUES(?)').run(code);
      receiptLine=db.prepare('INSERT INTO purchase_receipt_lines(receipt_id,product_id) SELECT id,? FROM purchase_receipts WHERE code=?').run(product,code).lastInsertRowid;
    } else {
      db.prepare("INSERT OR IGNORE INTO sales_orders(code,status) VALUES(?,'CONFIRMED')").run(code);
      const order=db.prepare('SELECT id FROM sales_orders WHERE code=?').get(code).id;
      db.prepare('INSERT OR IGNORE INTO sales_order_lines(order_id,product_id,quantity) VALUES(?,?,?)').run(order,product,Math.abs(delta));
      orderLine=db.prepare('SELECT id FROM sales_order_lines WHERE order_id=? AND product_id=?').get(order,product).id;
      if (kind==='SALE_CANCEL') db.prepare("UPDATE sales_orders SET status='CANCELLED' WHERE id=?").run(order);
    }
    db.prepare(`INSERT INTO stock_movements(product_id,movement_type,quantity_delta,quantity_after,purchase_receipt_line_id,
      sales_order_line_id,occurred_at) VALUES(?,?,?,?,?,?,?)`).run(product,kind,delta,after,receiptLine,orderLine,at);
  }
}

// A worker owns a distinct SQLite connection, so a lock wait never blocks the test coordinator.
async function transaction(file,fn) {
  const worker = new Worker(path.join(__dirname,'reference-worker.cjs'), { workerData:file, execArgv:['--no-warnings'] });
  let pending, failure;
  worker.on('message', reply => {
    if (reply.error) pending.reject(new Error(reply.error));
    else pending.resolve(reply.value);
    pending = null;
  });
  worker.on('error', error => { failure=error; if (pending) pending.reject(error); });
  const query = (sql,args=[],reading=false) => new Promise((resolve,reject) => {
    if (failure) return reject(failure);
    pending={resolve,reject};
    worker.postMessage({sql,args,reading});
  });
  try {
    await query('BEGIN');
    const result=await fn({rows:(sql,args)=>query(sql,args,true),change:(sql,args)=>query(sql,args)});
    await query('COMMIT');
    return result;
  } catch (error) {
    if (!failure) await query('ROLLBACK').catch(()=>{});
    throw error;
  } finally { await worker.terminate(); }
}

async function runReference(checks) {
  const dir = mkdtempSync(path.join(tmpdir(),'partstock-e-ref-'));
  const file = path.join(dir,'stock.sqlite');
  const init = new DatabaseSync(file);
  let version;
  try {
    try {
      init.exec(readFileSync(path.join(__dirname,'reference-schema.sql'),'utf8'));
      seed(init);
      version=init.prepare('SELECT sqlite_version() AS v').get().v;
    } finally { init.close(); }
    const tx = fn => transaction(file,fn);
    const now="strftime('%Y-%m-%d %H:%M:%f','now','+7 hours')";
    const ops=stockOperations({read:tx,write:tx,lock:'',now});
    let product, seq=0;
    async function move(db,kind,delta,field,line) {
      const changed=await db.change('UPDATE inventory SET quantity_on_hand=quantity_on_hand+? WHERE product_id=? AND quantity_on_hand+?>=0',
        [delta,product,delta]);
      if (!changed) return false;
      await db.change(`INSERT INTO stock_movements(product_id,movement_type,quantity_delta,quantity_after,${field},occurred_at)
        SELECT product_id,?,?,quantity_on_hand,?,${now} FROM inventory WHERE product_id=?`, [kind,delta,line,product]);
      return true;
    }
    Object.assign(ops,{
      newProduct:()=>tx(async db=>{
        await db.change('INSERT INTO products(sku) VALUES(?)',[demoSku]);
        product=(await db.rows('SELECT id FROM products WHERE sku=?',[demoSku]))[0].id;
        await db.change('INSERT INTO inventory(product_id,quantity_on_hand) VALUES(?,0)',[product]);
      }),
      receive:n=>tx(async db=>{
        const code='PN-E-'+(++seq);
        await db.change('INSERT INTO purchase_receipts(code) VALUES(?)',[code]);
        await db.change('INSERT INTO purchase_receipt_lines(receipt_id,product_id) SELECT id,? FROM purchase_receipts WHERE code=?',[product,code]);
        await move(db,'IMPORT',n,'purchase_receipt_line_id',(await db.rows('SELECT last_insert_rowid() AS id'))[0].id);
        return {code};
      }),
      draftSale:n=>tx(async db=>{
        const code='DB-E-'+(++seq);
        await db.change("INSERT INTO sales_orders(code,status) VALUES(?,'DRAFT')",[code]);
        await db.change('INSERT INTO sales_order_lines(order_id,product_id,quantity) SELECT id,?,? FROM sales_orders WHERE code=?',[product,n,code]);
        return {code};
      }),
      async confirmSale(order) {
        try { return await tx(async db=>{
          const ok=await db.change("UPDATE sales_orders SET status='CONFIRMED' WHERE code=? AND status='DRAFT'",[order.code]);
          if (!ok) throw new Error('ORDER_NOT_DRAFT');
          const [l]=await db.rows('SELECT l.id,l.quantity FROM sales_order_lines l JOIN sales_orders o ON o.id=l.order_id WHERE o.code=?',[order.code]);
          if (!await move(db,'SALE',-l.quantity,'sales_order_line_id',l.id)) throw new Error('INSUFFICIENT_STOCK');
          return 'CONFIRMED';
        }); } catch(e) { if (e.message==='INSUFFICIENT_STOCK') return e.message; throw e; }
      },
      cancel:order=>tx(async db=>{
        const ok=await db.change("UPDATE sales_orders SET status='CANCELLED' WHERE code=? AND status='CONFIRMED'",[order.code]);
        if (!ok) throw new Error('ORDER_NOT_CANCELLABLE');
        const [l]=await db.rows('SELECT l.id,l.quantity FROM sales_order_lines l JOIN sales_orders o ON o.id=l.order_id WHERE o.code=?',[order.code]);
        await move(db,'SALE_CANCEL',l.quantity,'sales_order_line_id',l.id);
      }),
      saleState:order=>tx(async db=>(await db.rows('SELECT status FROM sales_orders WHERE code=?',[order.code]))[0].status),
    });
    await runStockCases(ops,checks);
    return { version, engine:'SQLite', mode:'reference only', journal_mode:'WAL', node:process.version,
      writers:'local fixture; shared SQL for UC09/10/12; independent connection per transaction' };
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
module.exports={runReference};
