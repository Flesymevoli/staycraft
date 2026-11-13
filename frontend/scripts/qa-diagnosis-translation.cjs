const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>imports?.[name]??require(name),Response,Request,URL,TextDecoder,AbortSignal,console},{filename:file});return exports}
const lib=load('src/lib/diagnosis-translation.ts');
const id='11111111-1111-4111-8111-111111111111';
let run={id,language:'zh',summary:'收入 1200 元',metrics:{amountCents:120000},period:{start:'2026-11-11',end:'2026-11-17'},generatedAt:'2026-11-18T00:00:00Z',findings:[{id:'f1',title:'收入',conclusion:'收入 1200 元',reason:'已完成 3 间夜',action:'检查订单',uncertainty:'暂缺市场数据',evidenceIds:['e1']}],steps:[],limitations:[],evidence:[{id:'e1',title:'收入',source:'database',facts:['已完成 3 间夜']}],snapshots:[{evidence:{id:'e1',title:'收入',source:'database',facts:['已完成 3 间夜']},data:{amountCny:1200,roomNights:3}}],report:{title:'报告',summary:'收入 1200 元',sections:[{title:'收入',paragraphs:['已完成 3 间夜'],evidenceIds:['e1'],claims:[{evidenceId:'e1',path:'amountCny',value:1200}]}],recommendations:[],uncertainties:[]},actionPlan:{id:'plan1',items:[{id:'p1',status:'done'}]}};
const dictionary={'收入 1200 元':'Revenue 1200 yuan','收入':'Revenue','已完成 3 间夜':'3 completed room nights','检查订单':'Review bookings','暂缺市场数据':'Market data unavailable','报告':'Report'};
const source=lib.diagnosisTexts(run),translated={texts:source.map(s=>dictionary[s])};
const view=lib.applyTranslation(run,translated);
assert.equal(view.summary,'Revenue 1200 yuan');
for(const key of ['id','metrics','period','generatedAt','actionPlan'])assert.equal(view[key],run[key]);
assert.equal(view.snapshots[0].data,run.snapshots[0].data);assert.equal(view.report.sections[0].claims,run.report.sections[0].claims);
assert.equal(run.summary,'收入 1200 元');
assert.throws(()=>lib.validateTranslation(source,{texts:translated.texts.map(s=>s.replace('1200','1300'))}));
assert.throws(()=>lib.validateTranslation(source,{texts:translated.texts.slice(1)}));
assert.throws(()=>lib.validateTranslation(source,{...translated,metrics:{}}));
assert.throws(()=>lib.validateTranslation(['https://example.test/1'],{texts:['https://evil.test/1']}));
let calls=0,owner='a',allowed=true,broken=false;
class WorkspaceError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
const route=load('src/app/api/workspace/agent/translation/route.ts',{
 '@/lib/diagnosis-translation':lib,
 '@/lib/decision-agent-store':{agentStore:()=>({detail:async()=>allowed?{run}:{error:'analysis_not_found'}})},
 '@/lib/desktop-model':{desktopModelTransport:()=>undefined},
 '@/lib/operator-sample':{operatorModelEnabled:()=>true},
 '@/lib/model-provider':{modelChat:async(body,options)=>{calls++;assert.equal(options.purpose,'translation');assert.equal(body.tools,undefined);assert.equal(body.temperature,0);await new Promise(r=>setTimeout(r,10));return {response:Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({texts:JSON.parse(body.messages[1].content).map(s=>broken?s.replace('1200','9999'):dictionary[s]??s)})}}]})}}},
 '@/lib/workspace-access':{WorkspaceError,verifiedProperty:async()=>({supabase:{},propertyId:owner,user:{id:owner}}),requireSameOrigin:()=>{},boundedBody:async r=>new Uint8Array(await r.arrayBuffer()),workspaceFailure:e=>Response.json({error:e.code},{status:e.status})}
});
const request=(retry=false)=>route.POST(new Request('http://localhost/api/workspace/agent/translation',{method:'POST',body:JSON.stringify({runId:id,language:'en',...(retry?{retry:true}:{})})}));
(async()=>{
 const parallel=await Promise.all([request(),request()]);assert(parallel.every(r=>r.status===200));assert.equal(calls,1);
 assert.equal((await request()).status,200);assert.equal(calls,1);
 allowed=false;assert.equal((await request()).status,404);assert.equal(calls,1,'ownership checked before cache');allowed=true;
 owner='b';assert.equal((await request()).status,200);assert.equal(calls,2,'account caches isolated');
 run={...run,summary:'收入 1200 元。'};broken=true;assert.equal((await request()).status,503);assert.equal(calls,3,'changed source invalidates cache');
 broken=false;assert.equal((await request()).status,503);assert.equal(calls,3,'failure receipt prevents automatic repeat');const receipt=await route.GET(new Request('http://localhost/api/workspace/agent/translation?runId='+id+'&language=en'));assert.equal((await receipt.json()).state,'failed');assert.equal(calls,3,'checking a receipt never calls the model');assert.equal((await request(true)).status,200);assert.equal(calls,4,'failure is retryable');
 console.log('PASS translation: prose-only projection, immutable values/claims/plan, numeric and URL checks, account isolation, coalescing, caching, source invalidation and failure retry; mocked model only.');
})().catch(e=>{console.error(e);process.exitCode=1});
