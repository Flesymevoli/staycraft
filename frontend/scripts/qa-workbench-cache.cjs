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
let requests=0,hold;
const context={exports:exported,require:()=>({}),window,setTimeout,console,
 fetch:async(url,options)=>{
  assert.equal(url,'/api/workspace/agent');
  assert.equal(options.method,'POST');
  const language=JSON.parse(options.body).language;
  const id=++requests;
  if(hold){const wait=hold;hold=undefined;await wait;}
  return {ok:true,status:200,json:async()=>({run:{id:String(id),language,metrics:{},findings:[]}})};
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
  assert.equal((await request('account-a:property-a',true,false)).run.id,String(previous+1),event+' refreshes without a mounted homepage');
 }
 const english=await request('account-a:property-a',false,false);
 const other=await request('account-b:property-b',true,false);
 assert.notEqual(english.run.id,other.run.id,'accounts and language caches remain separate');
 window.dispatchEvent(new Event('staycraft-market-synced'));
 assert.notEqual((await request('account-a:property-a',false,false)).run.id,english.run.id,'inactive language is invalidated too');
 assert.notEqual((await request('account-b:property-b',true,false)).run.id,other.run.id,'a different account never receives another cache entry');

 let release;
 hold=new Promise(resolve=>{release=resolve});
 const pending=request('account-a:property-a',true,true);
 const oldId=String(requests);
 window.dispatchEvent(new Event('staycraft-market-synced'));
 const fresh=request('account-a:property-a',true,false);
 release();
 assert.equal((await pending).run.id,oldId);
 assert.notEqual((await fresh).run.id,oldId,'sync during a pending read queues a fresh read');
 const after=requests;
 assert.equal((await request('account-a:property-a',true,false)).run.id,String(after));
 assert.equal(requests,after,'the refreshed result is cached');
 console.log('PASS workbench cache: cross-page sync/profile/inventory/bookings changes, language/account separation, pending-read invalidation, unchanged-cache reuse');
})().catch(error=>{console.error(error);process.exitCode=1});
