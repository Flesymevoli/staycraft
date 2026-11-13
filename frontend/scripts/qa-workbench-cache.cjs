// Exercise the real module cache without mounting the homepage. Data changes
// must invalidate it while another page is open, including in-flight reads.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

const file=path.resolve(__dirname,'../src/components/workbench-dashboard.tsx');
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
}).outputText;
const window=new EventTarget();
const exported={};
let requests=0,hold,rateLimited=false;
const context={exports:exported,require:name=>name==='@/lib/operation-state'?{startOperation:()=>String(Math.random()),updateOperation(){},readOperation:()=>null}:{},window,setTimeout,console,AbortSignal,
 fetch:async(url,options)=>{
  assert.equal(url,'/api/workspace/agent');
  assert.equal(options.method,'POST');
  const language=JSON.parse(options.body).language;
  const id=++requests;
  if(hold){const wait=hold;hold=undefined;await wait;}
  return {ok:true,status:200,json:async()=>({run:{id:String(id),language,metrics:{},findings:[],...(rateLimited?{phase:'writing_failed',errorCode:'model_rate_limited'}:{})}})};
 },
};
// Expose the existing private request only in this isolated test context;
// production code keeps its cache private and has no test-only API.
vm.runInNewContext(compiled+'\nexports.requestDiagnosis=requestDiagnosis;',context,{filename:file});
const request=exported.requestDiagnosis;

(async()=>{
 const first=await request('account-a:property-a',true,false);
 assert.equal((await request('account-a:property-a',true,false)).run.id,first.run.id);
 assert.equal(requests,1,'unchanged data reuses the cache');
 for(const event of ['staycraft-market-synced','staycraft-profile-changed','staycraft-inventory-changed','staycraft-stays-changed','staycraft-import-changed','staycraft-activity-changed']){
  const previous=requests;
  window.dispatchEvent(new Event(event));
  assert.equal((await request('account-a:property-a',true,false)).run.id,String(previous),event+' marks data stale without automatically calling AI');assert.equal((await request('account-a:property-a',true,true)).run.id,String(previous+1),'explicit diagnosis refresh');
 }
 const beforeLanguage=requests;
 const english=await request('account-a:property-a',false,false);
 assert.equal(requests,beforeLanguage,'language switch reuses the same diagnosis');
 const other=await request('account-b:property-b',true,false);
 assert.notEqual(english.run.id,other.run.id,'account caches remain separate');
 window.dispatchEvent(new Event('staycraft-market-synced'));
 assert.equal((await request('account-a:property-a',false,false)).run.id,english.run.id,'old diagnosis remains until explicit regeneration');
 assert.equal((await request('account-b:property-b',true,false)).run.id,other.run.id,'a different account keeps its own cache');

 let release;
 hold=new Promise(resolve=>{release=resolve});
 const pending=request('account-a:property-a',true,true);
 const oldId=String(requests);
 window.dispatchEvent(new Event('staycraft-market-synced'));
 const fresh=request('account-a:property-a',true,false);
 release();
 assert.equal((await pending).run.id,oldId);
 assert.equal((await fresh).run.id,oldId,'sync during an active request never queues a second paid call');
 const after=requests;
 assert.equal((await request('account-a:property-a',true,false)).run.id,String(after));
 assert.equal(requests,after,'the refreshed result is cached');
 rateLimited=true;const beforeLimited=requests;await request('rate-limit-account:property',true,true);assert.equal(requests,beforeLimited+1,'rate-limited investigation must not trigger report writing');
 const demoFirst=await request('local-demo:property',true,false,true);
 window.dispatchEvent(new Event('staycraft-stays-changed'));
 const demoUpdated=await request('local-demo:property',true,false,true);
 assert.notEqual(demoUpdated.run.id,demoFirst.run.id,'isolated demo regenerates after import');
 let finishLocal;hold=new Promise(resolve=>{finishLocal=resolve});
 const demoPending=request('local-demo:property',true,true,true);
 window.dispatchEvent(new Event('staycraft-market-synced'));
 const demoFresh=request('local-demo:property',true,false,true);finishLocal();
 assert.notEqual((await demoFresh).run.id,(await demoPending).run.id,'demo sync during an active diagnosis refreshes once it finishes');
 console.log('PASS workbench cache: cross-page sync/profile/inventory/bookings changes, language reuse/account separation, pending-read invalidation, unchanged-cache reuse');
})().catch(error=>{console.error(error);process.exitCode=1});
