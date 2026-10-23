const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/revenue-source.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const {monthBounds,completedRevenueOrder}=m.exports;
assert.deepEqual(monthBounds('2026-12'),{start:'2026-12-01',end:'2027-01-01'});
for(const month of ['2026-00','2026-13','26-10','../2026-10'])assert.throws(()=>monthBounds(month));
const row={id:'a',room_number:'101',type_name:'A',arrival:'2026-09-30',departure:'2026-10-03',total:'100.01',status:'confirmed',stay_state:'completed'};
assert.equal(completedRevenueOrder(row).totalCents,10001);
for(const patch of [{status:'cancelled'},{stay_state:'pending'},{total:'1.001'},{total:'NaN'},{total:-1},{arrival:'2026-02-30'},{departure:row.arrival}])assert.throws(()=>completedRevenueOrder({...row,...patch}));
console.log('PASS formal revenue source: date bounds, exact cents, completed-only, malformed data rejected.');

const routeModule={exports:{}};let pages=[],calls=[];
class WorkspaceError extends Error{constructor(code,status){super(code);this.status=status}}
const source=m.exports;
new Function('exports','require',ts.transpileModule(fs.readFileSync('src/app/api/workspace/revenue/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(routeModule.exports,name=>name.includes('revenue-source')?source:{WorkspaceError,workspaceFailure:error=>new Response('{}',{status:error.status||503}),verifiedProperty:async()=>({propertyId:'owned',supabase:{from:table=>{assert.equal(table,'direct_bookings');const query={};for(const method of ['select','eq','lt','gt','order'])query[method]=(...args)=>{calls.push([method,...args]);return query};query.range=async(a,b)=>{calls.push(['range',a,b]);return pages.shift()};return query}}})});
(async()=>{
 const many=Array.from({length:1000},(_,i)=>({...row,id:'order-'+i}));pages=[{data:many,count:1001},{data:[{...row,id:'last'}],count:1001}];let response=await routeModule.exports.GET(new Request('http://localhost/api/workspace/revenue?month=2026-10'));assert.equal(response.status,200);assert.equal((await response.json()).orders.length,1001);assert(calls.some(call=>call[0]==='eq'&&call[1]==='property_id'&&call[2]==='owned'));assert(calls.some(call=>call[0]==='range'&&call[1]===1000));
 for(const invalid of [{data:[row],count:2},{data:[row],count:null},{data:[row,row],count:2},{data:[],count:10001}]){pages=[invalid];response=await routeModule.exports.GET(new Request('http://localhost/api/workspace/revenue?month=2026-10'));assert.equal(response.status,503)}
 const huge=Array.from({length:10},(_,page)=>({count:10000,data:Array.from({length:1000},(_,i)=>({...row,id:'big-'+page+'-'+i,total:'9999999999.99'}))}));pages=huge;response=await routeModule.exports.GET(new Request('http://localhost/api/workspace/revenue?month=2026-10'));assert.equal(response.status,503);
 console.log('PASS formal revenue pagination: 1001 orders, owned-property filter, truncated/unknown/duplicate/oversized result fails closed.');
})().catch(error=>{console.error(error);process.exitCode=1});
