// run.cjs bundles cases.js, runId and fixture with this native CommonJS module for mongosh.
const labName = 'partstock_lab';
const txOptions = {readConcern:{level:'snapshot'},writeConcern:{w:'majority'}};
const instant = civil => new Date(civil.replace(' ','T') + '+07:00');
const checks = [];

async function mongoStockCases(db) {
  if (!/^[a-f0-9]{24}$/.test(runId) || (await db.getName()) !== labName ||
      process.env.MONGO_LAB_DATABASE !== labName || process.env.MONGO_LAB_USERNAME !== labName) {
    throw new Error('Unexpected MongoDB lab target');
  }
  const hello = await db.hello();
  if (!hello.isWritablePrimary || hello.setName !== 'rs0') throw new Error('Expected rs0 PRIMARY');
  const auth = await db.runCommand({connectionStatus:1});
  if (!auth.authInfo.authenticatedUsers.some(u => u.db===labName && u.user===labName)) throw new Error('Lab account required');
  const version = await db.version();
  const names = {};
  const created = [];
  const prefix='euc_'+runId+'_';
  async function scope(database) {
    return {stock:await database.getCollection(names.stock), moves:await database.getCollection(names.moves),
      docs:await database.getCollection(names.docs),counts:await database.getCollection(names.counts)};
  }
  const mongo = await db.getMongo();
  async function write(fn) {
    const session=await mongo.startSession();
    let value;
    try {
      await session.withTransaction(async()=>{ value=await fn(await scope(await session.getDatabase(labName))); },txOptions);
      return value;
    } finally { await session.endSession(); }
  }
  function readers(c) {
    return {
      async history(sku,from,to,kind=null) {
        requirePeriod(from,to);
        const start=instant(from),end=instant(to);
        const sums=await (await c.moves.aggregate([
          {$match:{sku,at:{$lt:end}}},
          {$group:{_id:null,opening:{$sum:{$cond:[{$lt:['$at',start]},'$delta',0]}},closing:{$sum:'$delta'}}}
        ])).toArray();
        const match={sku,at:{$gte:start,$lt:end}};
        if (kind !== null) match.kind=kind;
        const rows=await (await c.moves.aggregate([
          {$match:match},{$sort:{at:1,seq:1}},
          {$lookup:{from:names.docs,localField:'source',foreignField:'_id',as:'doc'}},
          {$lookup:{from:names.counts,localField:'source',foreignField:'_id',as:'count'}},
          {$project:{_id:0,kind:1,delta:1,after:1,source:{$ifNull:[{$arrayElemAt:['$doc._id',0]},{$arrayElemAt:['$count._id',0]}]},reason:1}}
        ])).toArray();
        return { opening:Number(sums[0]?.opening??0),closing:Number(sums[0]?.closing??0),
          rows:rows.map(m=>({kind:m.kind,delta:Number(m.delta),after:Number(m.after),source:m.source??null,reason:m.reason??null})) };
      },
      async threshold(sku) {
        const t=await c.stock.findOne({_id:sku});
        return {quantity:Number(t.q),limit:t.limit===null?null:Number(t.limit),
          state:t.limit===null?'UNCONFIGURED':t.q<t.limit?'LOW':'OK'};
      },
      async lowList() {
        const rows=await (await c.stock.aggregate([
          {$match:{limit:{$ne:null},$expr:{$lt:['$q','$limit']}}},
          {$project:{q:1,limit:1,shortage:{$subtract:['$limit','$q']}}},{$sort:{shortage:-1,_id:1}}
        ])).toArray();
        return rows.map(t=>[t._id,Number(t.q),Number(t.limit),Number(t.shortage)]);
      },
      async countState(code) { return (await c.counts.findOne({_id:code}))?.status??null; },
      async mismatches() {
        const rows=await (await c.stock.aggregate([
          {$lookup:{from:names.moves,localField:'_id',foreignField:'sku',as:'ledger'}},
          {$match:{$expr:{$or:[{$lt:['$q',0]},{$ne:['$q',{$sum:'$ledger.delta'}]}]}}},{$sort:{_id:1}}
        ])).toArray();
        return rows.map(r=>r._id);
      }
    };
  }
  // The reader callback can start a writer in a different session. Do not retry that callback.
  async function read(fn) {
    const s=await mongo.startSession();
    try {
      await s.startTransaction(txOptions);
      const data=await fn(readers(await scope(await s.getDatabase(labName))));
      await s.commitTransaction();
      return data;
    } catch(e) {
      try { await s.abortTransaction(); } catch(_) {}
      throw e;
    } finally { await s.endSession(); }
  }
  async function append(c,kind,delta,source,reason,updated) {
    await c.moves.insertOne({sku:demoSku,kind,delta,after:updated.q,source,reason,seq:updated.seq,at:new Date()});
  }
  async function shift(c,kind,delta,code) {
    const changed=await c.stock.updateOne({_id:demoSku,q:{$gte:Math.max(0,-delta)}},{$inc:{q:delta,seq:1}});
    if (!changed.matchedCount) throw businessFailure('INSUFFICIENT_STOCK');
    await append(c,kind,delta,code,null,await c.stock.findOne({_id:demoSku}));
  }
  let sequence=0;
  const a={read,
    async setThreshold(sku,limit) {
      if (!validThreshold(limit)) throw businessFailure('INVALID_THRESHOLD');
      return write(c=>c.stock.updateOne({_id:sku},{$set:{limit}}));
    },
    newProduct:()=>write(c=>c.stock.insertOne({_id:demoSku,q:0,revision:0,seq:0,limit:null})),
    receive(n) {
      const code='PN-E-'+(++sequence);
      return write(async c=>{
        await c.docs.insertOne({_id:code,status:'CONFIRMED',lines:[{sku:demoSku,quantity:n}]});
        await shift(c,'IMPORT',n,code);
        return {code};
      });
    },
    draftSale(n) {
      const code='DB-E-'+(++sequence);
      return write(async c=>{await c.docs.insertOne({_id:code,status:'DRAFT',lines:[{sku:demoSku,quantity:n}]});return {code};});
    },
    async confirmSale(order) {
      try { return await write(async c=>{
        const changed=await c.docs.updateOne({_id:order.code,status:'DRAFT'},{$set:{status:'CONFIRMED'}});
        if (!changed.matchedCount) throw businessFailure('ORDER_NOT_DRAFT');
        const doc=await c.docs.findOne({_id:order.code});
        await shift(c,'SALE',-doc.lines[0].quantity,order.code);
        return 'CONFIRMED';
      }); } catch(e) {if(e.stockCaseCode==='INSUFFICIENT_STOCK')return e.stockCaseCode;throw e;}
    },
    cancel:order=>write(async c=>{
      const changed=await c.docs.updateOne({_id:order.code,status:'CONFIRMED'},{$set:{status:'CANCELLED'}});
      if (!changed.matchedCount) throw businessFailure('ORDER_NOT_CANCELLABLE');
      const doc=await c.docs.findOne({_id:order.code});
      await shift(c,'SALE_CANCEL',doc.lines[0].quantity,order.code);
    }),
    saleState:async order=>(await (await scope(db)).docs.findOne({_id:order.code})).status,
    async openCount(code,counted,reason) {
      if (!validCount(counted,reason)) return 'INVALID_COUNT';
      return write(async c=>{
        const stock=await c.stock.findOne({_id:demoSku});
        await c.counts.insertOne({_id:code,status:'DRAFT',reason:reason.trim(),
          line:{sku:demoSku,system:Number(stock.q),counted,revision:Number(stock.revision)}});
        return 'DRAFT';
      });
    },
    async confirmCount(code,hooks={}) {
      try { return await write(async c=>{
        // Pin a view for this transaction before telling the race coordinator it has started.
        const count=await c.counts.findOne({_id:code});
        if (hooks.started) await hooks.started();
        if (!count) throw new Error('Unknown count '+code);
        if (count.status==='CONFIRMED') return 'ALREADY_CONFIRMED';
        const changed=await c.counts.updateOne({_id:code,status:'DRAFT'},{$set:{status:'CONFIRMED'}});
        if (!changed.matchedCount) throw new Error('Unexpected count transition');
        const delta=count.line.counted-count.line.system;
        const stock=await c.stock.findOne({_id:demoSku});
        if (Number(stock.revision)!==count.line.revision) throw businessFailure('COUNT_SUPERSEDED');
        if (Number(stock.q)+delta<0) throw businessFailure('NEGATIVE_STOCK');
        const updated=await c.stock.updateOne({_id:demoSku,revision:count.line.revision,q:{$gte:Math.max(0,-delta)}},
          {$inc:{q:delta,revision:1,seq:delta===0?0:1}});
        if (!updated.matchedCount) throw new Error('Expected writable inventory document');
        if (hooks.fault) throw businessFailure('FAULT_INJECTED');
        if (delta!==0) await append(c,'ADJUSTMENT',delta,code,count.reason,await c.stock.findOne({_id:demoSku}));
        if (hooks.staged) await hooks.staged();
        return delta===0?'NO_CHANGE':'ADJUSTED';
      }); } catch(e) {if(e.stockCaseCode)return e.stockCaseCode;throw e;}
    }
  };
  try {
    const existing = await db.getCollectionNames();
    if (existing.some(n => n.startsWith(prefix))) throw new Error('Lab prefix already in use');
    for (const key of ['stock','docs','moves','counts']) {
      names[key]=prefix+key;
      await db.createCollection(names[key]);
      created.push(names[key]);
    }
    const c=await scope(db);
    await c.moves.createIndex({sku:1,kind:1,source:1},{unique:true});
    await c.moves.createIndex({sku:1,at:1,seq:1});
    for (const [sku,q] of fixture.products) {
      await c.stock.insertOne({_id:sku,q,revision:0,limit:null,seq:fixture.movements.filter(m=>m[0]===sku).length});
    }
    const seqBySku={};
    const docs=new Map();
    for (const [sku,kind,delta,after,source,at] of fixture.movements) {
      const seq=seqBySku[sku]=(seqBySku[sku]??0)+1;
      await c.moves.insertOne({sku,kind,delta,after,source,at:instant(at),seq,reason:null});
      if (!docs.has(source)) docs.set(source,{_id:source,status:'CONFIRMED',lines:[]});
      if (kind==='SALE_CANCEL') docs.get(source).status='CANCELLED';
      else docs.get(source).lines.push({sku,quantity:Math.abs(delta)});
    }
    await c.docs.insertMany([...docs.values()]);
    await runStockCases(a,checks);
    return {version,topology:hello.setName,members:hello.hosts,readConcern:'snapshot',writeConcern:'majority',
      collectionPrefix:prefix,writers:'MongoDB lab model; embedded document lines'};
  } finally {
    for (const name of created.reverse()) await (await db.getCollection(name)).drop();
  }
}

module.exports = async function executeStockSuite(db) {
  try {
    const environment = await mongoStockCases(db);
    return {status:'PASS',environment,checks};
  } catch (error) { return {status:'FAIL',error:error.message,checks}; }
};
