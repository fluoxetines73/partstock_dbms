'use strict';
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname,'../../..');
const envFile = path.join(root,'.env.docker');
const read = name => fs.readFileSync(path.join(__dirname,name),'utf8');
const { runMysql } = require('../mysql/stock-ucs.cjs');

function unavailable(message) { return Object.assign(new Error(message), {code:'ENV_UNAVAILABLE'}); }

function runMongo(checks) {
  const args = ['compose','--env-file',envFile,'-f',path.join(root,'compose.local.yaml'),'exec','-T','mongo-lab'];
  const shell = `test "$MONGO_LAB_DATABASE" = partstock_lab
test "$MONGO_LAB_USERNAME" = partstock_lab
test -n "$MONGO_LAB_PASSWORD"
f=$(mktemp /tmp/partstock-e-XXXXXXXX.cjs)
trap 'rm -f "$f"' EXIT
cat > "$f"
export E_STOCK_MODULE="$f"
mongosh --quiet --norc 'mongodb://127.0.0.1:27017/partstock_lab?replicaSet=rs0&directConnection=true' --authenticationDatabase "$MONGO_LAB_DATABASE" --username "$MONGO_LAB_USERNAME" --password "$MONGO_LAB_PASSWORD" --file /dev/stdin <<'ROLE_E_MONGO'
async function runRoleE() {
  const modulePath = process.env.E_STOCK_MODULE;
  const loadNative = require("node:module").createRequire(modulePath);
  const runSuite = loadNative(modulePath);
  const result = await runSuite(db);
  print("E_STOCK_RESULT " + JSON.stringify(result));
  if (result.status !== "PASS") quit(1);
}
runRoleE();
ROLE_E_MONGO`;
  const payload = `const runId=${JSON.stringify(randomBytes(12).toString('hex'))};\nconst fixture=${read('fixture.json')};\n` +
    read('cases.js')+'\n'+read('../mongodb/stock-ucs.js');
  const docker=spawnSync('docker',['compose','version'],{encoding:'utf8',timeout:10000});
  if (docker.status !== 0) throw unavailable('Docker Compose v2 is unavailable.');
  if (!fs.existsSync(envFile)) throw unavailable('Missing .env.docker at the project root.');
  const result=spawnSync('docker',[...args,'sh','-eu','-c',shell],{
    cwd:root,input:payload,encoding:'utf8',maxBuffer:8*1024*1024,timeout:240000
  });
  const record=(result.stdout??'').split('\n').find(line=>line.startsWith('E_STOCK_RESULT '));
  if (!record) {
    const detail = [result.error?.message, result.stderr?.trim(), result.stdout?.trim()]
      .filter(Boolean).join('\n') || 'missing result marker';
    throw new Error('mongo-lab: '+detail);
  }
  const report=JSON.parse(record.slice('E_STOCK_RESULT '.length));
  checks.push(...report.checks);
  if(result.status!==0 || report.status!=='PASS') throw new Error(report.error||'MongoDB exited without PASS');
  return report.environment;
}

async function run(target) {
  const checks=[];
  try {
    let environment;
    if (target==='mysql') {
      if (!fs.existsSync(envFile)) throw unavailable('Missing .env.docker for the local mysql-lab.');
      process.loadEnvFile(envFile);
      const backend=createRequire(path.join(root,'backend/package.json'));
      try { backend.resolve('mysql2/promise'); backend.resolve('./dist/db.js'); }
      catch (_) { throw unavailable('Install the locked backend dependencies and build backend first.'); }
      environment=await runMysql(root,checks);
    } else if (target==='mongodb') environment=runMongo(checks);
    else environment=await require('./reference.cjs').runReference(checks);
    if (!checks.length || checks.some(c=>!c.passed)) throw new Error('Incomplete checks');
    return {target,status:'PASS',environment,checks};
  } catch(error) {
    const missing=error.code==='ENV_UNAVAILABLE' || (!checks.length && error.code==='ECONNREFUSED');
    return {target,status:missing?'NOT_RUN':'FAIL',error:error.message,checks};
  }
}

async function main() {
  const [mode='all',option,...rest]=process.argv.slice(2);
  if(!['mysql','mongodb','all','reference'].includes(mode) || (option!==undefined && option!=='--save') || rest.length) {
    throw new Error('Usage: node experiments/concurrency/stock-ucs/run.cjs [all|mysql|mongodb|reference] [--save]');
  }
  const started=new Date().toISOString(), runs=[];
  for(const target of (mode==='all'?['mysql','mongodb']:[mode])) runs.push(await run(target));
  let status=runs.some(r=>r.status==='FAIL')?'FAIL':runs.some(r=>r.status!=='PASS')?'INCOMPLETE':'PASS';
  if(mode==='all' && status==='PASS') {
    const ids=r=>r.checks.map(c=>c.id);
    if(JSON.stringify(ids(runs[0]))!==JSON.stringify(ids(runs[1]))) status='FAIL';
  }
  const report={suite:'PartStock E | UC09, UC10, UC12',mode,started,finished:new Date().toISOString(),status,runs};
  const body=JSON.stringify(report,null,2)+'\n';
  if(option==='--save') {
    const dir=path.join(root,'role-e-results');
    fs.mkdirSync(dir,{recursive:true});
    const name='uc-'+mode+'-'+started.replace(/[:.]/g,'-')+'-'+randomBytes(3).toString('hex')+'.json';
    const file=path.join(dir,name);
    fs.writeFileSync(file,body,{flag:'wx'});
    console.error('Result: '+file);
  }
  process.stdout.write(body);
  if(status!=='PASS') process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
