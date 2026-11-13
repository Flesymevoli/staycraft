const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(name,extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,crypto,Date,Map,Set,Promise,console,...extra});return exports;}
(async()=>{
 const storage=new Map(),env={window:{},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 const op=load('operation-state',env),input={phase:'saving',stage:'正在保存',stageEn:'Saving',detail:'等待回执',detailEn:'Waiting for receipt'};
 const id=op.startOperation('owner-a:property-a','import',input);assert.equal(op.readOperation('owner-b:property-b','import'),null);
 const reloaded=load('operation-state',env);assert.equal(reloaded.readOperation('owner-a:property-a','import').phase,'uncertain');
 op.updateOperation('owner-a:property-a','import','stale-id',{phase:'complete'});assert.equal(op.readOperation('owner-a:property-a','import').phase,'saving');
 op.updateOperation('owner-a:property-a','import',id,{phase:'complete',count:26});assert.equal(load('operation-state',env).readOperation('owner-a:property-a','import').count,26);
 op.retainOperationInput('owner-a:property-a','promotion',{content:'private draft'});assert.equal(op.retainedOperationInput('owner-b:property-b','promotion'),undefined);assert(![...storage.values()].join().includes('private draft'));
 const receipts=load('generation-receipts');let paid=0,release;const gate=new Promise(r=>release=r);
 const work=async()=>{paid++;await gate;return {draft:'same result'}};
 const first=receipts.generateOnce('account-a:request-1','same',work),second=receipts.generateOnce('account-a:request-1','same',work);await Promise.resolve();assert.equal(paid,1);assert.equal(receipts.generationReceipt('account-a:request-1').state,'running');assert.throws(()=>receipts.generateOnce('account-a:request-1','different',work));
 release();assert.equal(await first,await second);assert.equal(receipts.generationReceipt('account-a:request-1').state,'complete');assert.equal(receipts.generationReceipt('account-b:request-1').state,'unknown');
 await assert.rejects(receipts.generateOnce('failed','same',async()=>{paid++;throw Error('failed')}));await assert.rejects(receipts.generateOnce('failed','same',work));assert.equal(paid,2,'failed receipt does not silently repeat a paid call');
 await assert.rejects(receipts.generateOnce('limited','same',async()=>{throw Object.assign(Error('private provider detail'),{code:'promotion_rate_limited'})}));assert.equal(receipts.generationReceipt('limited').error,'promotion_rate_limited');
 console.log('PASS operation states and receipts: account isolation, stale updates, reopen recovery, metadata-only persistence, concurrent coalescing, conflict rejection and failed-request reuse.');
})().catch(e=>{console.error(e);process.exitCode=1});
