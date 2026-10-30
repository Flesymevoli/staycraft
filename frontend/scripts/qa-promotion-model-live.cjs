// Opt-in one-call integration check. Sends generic IDs only, no business data.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
assert.equal(process.env.RUN_PAID_MODEL_TEST,'1','Requires RUN_PAID_MODEL_TEST=1');
require('@next/env').loadEnvConfig(process.cwd());
const cache={};function load(name){if(cache[name])return cache[name];const mod={exports:{}};new Function('exports','require',ts.transpileModule(fs.readFileSync('src/lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports,id=>load(id.replace('./','')));return cache[name]=mod.exports}
(async()=>{
 const provider=new URL(process.env.MODEL_BASE_URL);assert.equal(provider.protocol,'https:');let calls=0;
 const {arrangePromotion}=load('promotion');const ids=['location','room_0','room_1','source_0'];
 const result=await arrangePromotion(ids,{language:'zh',goal:'local',channel:'xiaohongshu',start:'2026-10-30',end:'2026-11-02',sourceIds:[]},{model:true,fetcher:async(url,init)=>{
  assert.equal(++calls,1,'One-call budget exceeded');assert.equal(new URL(url).origin,provider.origin);assert.equal(init.redirect,'manual');const body=JSON.parse(init.body);assert.deepEqual(JSON.parse(body.messages[1].content),{goal:'local',channel:'xiaohongshu',ids});return fetch(url,init);
 }});
 assert.equal(calls,1);assert.equal(result.engine,'model_v1','Provider did not return a valid arrangement');assert.equal(result.fallback,false);
 fs.writeFileSync('qa-promotion-model-live-report.json',JSON.stringify({passed:true,date:'2026-10-30',calls,engine:result.engine,privateDataSent:false},null,2));
 console.log('PASS real promotion arrangement: one request, generic IDs only, valid fixed-fact result. No business data sent.');
})().catch(()=>{console.error('Promotion model check failed; credentials and provider response not logged.');process.exitCode=1});
