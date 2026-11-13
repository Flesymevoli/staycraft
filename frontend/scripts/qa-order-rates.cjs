const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file){const mod=new Module(file);mod.require=name=>name==='server-only'?{}:name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports;}
const {summarizeOrderRates}=load(path.resolve(__dirname,'../src/lib/order-rates.ts'));
const {readOrderRates}=load(path.resolve(__dirname,'../src/lib/read-order-rates.ts'));
const day='2026-11-14';
const one={id:'1',type_id:'type1',arrival:'2026-11-13',departure:'2026-11-15',total:600,status:'confirmed',external_id:'ext1',external_snapshot:{currency:'CNY',status:'confirmed'}};
const two={...one,id:'2',external_id:'ext2',total:'500',arrival:day};
const three={...one,id:'3',type_id:'type2',external_id:'ext3',total:900,departure:'2026-11-16',external_snapshot:{currency:'CNY',status:'completed'}};
const excluded=[{...one,id:'cancel',status:'cancelled'},{...one,id:'snapshot-cancel',external_snapshot:{currency:'CNY',status:'cancelled'}},{...one,id:'checkout',departure:day},{...one,id:'future',arrival:'2026-11-15',departure:'2026-11-16'},{...one,id:'direct',external_id:null},{...one,id:'currency',external_snapshot:{currency:'USD'}},{...one,id:'invalid',total:NaN},one];
const result=summarizeOrderRates([one,two,three,...excluded],day);assert.equal(result.count,3);assert.equal(result.average,1100/3);assert.deepEqual(result.byType.type1,{average:400,count:2});assert.deepEqual(result.byType.type2,{average:300,count:1});
assert.equal(summarizeOrderRates([one,two,three],'2026-11-15').average,300);assert.equal(summarizeOrderRates([one,two,three],'2026-11-16').average,null);assert.equal(summarizeOrderRates([one],'bad').count,0);
const updated=summarizeOrderRates([{...one,total:800}],day);assert.equal(updated.average,400,'read latest order amount, no accumulated import duplicates');
function client(pages){const calls=[];return {calls,from(table){calls.push(['table',table]);const q={};for(const method of ['select','eq','not','lte','gt','order','range'])q[method]=(...args)=>{calls.push([method,...args]);return q;};q.abortSignal=()=>Promise.resolve(pages.shift());return q;}};}
(async()=>{
const first=Array.from({length:500},(_,i)=>({...one,id:'row'+i})),second=[{...two,id:'last'}];const db=client([{data:first,error:null},{data:second,error:null}]);const read=await readOrderRates(db,'owner-property',day);assert.equal(read.status,'ready');assert.equal(read.summary.count,501);assert(db.calls.some(c=>c.join('|')==='eq|property_id|owner-property'));assert(db.calls.some(c=>c.join('|')==='lte|arrival|'+day));assert(db.calls.some(c=>c.join('|')==='gt|departure|'+day));assert(db.calls.some(c=>c.join('|')==='range|500|999'));assert(db.calls.some(c=>c.join('|')==='not|external_id|is|'));
const fail=await readOrderRates(client([{data:first,error:null},{data:null,error:{message:'offline'}}]),'owner-property',day);assert.equal(fail.status,'unavailable');assert.equal(fail.summary,undefined,'never use partial query results');
console.log('PASS same-day imported booking rates: nightly normalization, checkout exclusion, cancel/currency/duplicates, per-type and whole-property means, date changes, property-scoped pagination and failure handling.');
})().catch(e=>{console.error(e);process.exitCode=1});
