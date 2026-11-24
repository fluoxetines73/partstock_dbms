'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(workerData);
db.exec('PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON;');
parentPort.on('message', ({sql,args,reading}) => {
  try {
    const stmt = db.prepare(sql);
    const value = reading ? stmt.all(...args) : Number(stmt.run(...args).changes);
    parentPort.postMessage({value});
  } catch (e) { parentPort.postMessage({error:e.message}); }
});
