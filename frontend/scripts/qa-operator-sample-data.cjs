const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {createSample}=require('./operator-sample-data.cjs');
const file=path.resolve(__dirname,'../src/lib/agent-revenue.ts'),m=new Module(file);m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {aggregateRevenue}=m.exports;
const shift=(date,n)=>new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10);
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name)};
test('basic fixture retains five original rows and states',()=>{
 const s=createSample('2026-11-05');assert.equal(s.bookings.length,5);assert.deepEqual(s.bookings.map(b=>[b.room_number,b.arrival,b.departure,b.status,b.refund_result]),[['101','2026-11-05','2026-11-07','confirmed',null],['103','2026-11-03','2026-11-05','confirmed',null],['202','2026-11-06','2026-11-08','confirmed',null],['102','2026-11-05','2026-11-06','cancelled','auto_cancelled'],['201','2026-11-05','2026-11-06','confirmed','review_pending']]);assert(s.bookings.every(b=>!b.external_channel&&!b.stay_state));
});
for(const anchor of ['2026-11-05','2026-11-09','2027-01-02','2028-03-01'])test('rich temporal consistency, non-overlap and channel evidence '+anchor,()=>{
 const s=createSample(anchor,{rich:true}),occupied=new Set(),ids=new Set();assert.match(s.profile.name,/虚构/);assert.match(s.profile.notes,/虚构/);
 assert.deepEqual(s,createSample(anchor,{rich:true}));
 for(const b of s.bookings){
  assert(!ids.has(b.id));ids.add(b.id);assert.match(b.guest_name,/虚构/);assert(b.arrival<b.departure);assert.equal(Math.round(b.total*100),Math.round(b.nightly_rate*100)*(Date.parse(b.departure)-Date.parse(b.arrival))/86400000);
  if(b.external_channel){assert.match(b.external_id,/^fictional-/);assert.equal(b.external_snapshot.fictional,true);assert.equal(b.external_snapshot.currency,'CNY')}
  if(b.status!=='confirmed')continue;
  if(b.departure<anchor){assert.equal(b.stay_state,'completed');assert(b.checked_out_at)}
  if(b.stay_state==='completed')assert(b.departure<=anchor);
  for(let d=b.arrival;d<b.departure;d=shift(d,1)){const key=b.room_id+':'+d;assert(!occupied.has(key),'overlapping '+key);occupied.add(key)}
 }
 const x=aggregateRevenue(s.bookings,{start:shift(anchor,-7),end:shift(anchor,-1)},anchor);
 assert.equal(x.comparison.available,true);assert.equal(x.totals.uncompletedPast.roomNights,0);assert.deepEqual(x.breakdowns.channels.map(c=>c.name).sort(),['ctrip','direct','meituan']);assert(x.breakdowns.roomTypes.length===3);
 const future=aggregateRevenue(s.bookings,{start:anchor,end:shift(anchor,27)},anchor);assert(future.totals.futureBooked.roomNights>0);assert(future.totals.futureBooked.roomNights<140);assert.equal(future.totals.completed.roomNights,0);
});
test('revenue, sold nights and ADR vary across completed periods',()=>{
 const anchor='2026-11-05',s=createSample(anchor,{rich:true});
 const values=[-35,-28,-21,-14,-7].map(n=>aggregateRevenue(s.bookings,{start:shift(anchor,n),end:shift(anchor,n+6)},anchor).totals.completed);
 for(const k of ['roomNights','amountCny','averageRateCny'])assert(new Set(values.map(v=>v[k])).size>1,k);
 console.log('Completed weekly metrics:',JSON.stringify(values));
});
async function checkIsolatedDatabase(){
 process.env.STAYCRAFT_QA_IMPORT_DB='1';
 const s=createSample('2026-11-05',{rich:true});
 const db=require('./import-database-fixture.cjs')(s,()=>s.inventory);
 const response=await db.handle(new URL('http://fixture/rest/v1/rpc/get_booking_metrics_range'),{body:JSON.stringify({p_property:s.propertyId,p_start:'2026-11-05',p_end:'2026-11-11'})},{id:s.ownerId});
 const result=await response.json();await db.close();assert.equal(response.status,200,JSON.stringify(result));assert(result.booked_order_room_nights>0);assert.equal(result.overlapping_order_room_nights,0);count++;console.log('PASS isolated PostgreSQL seed accepts rich channel metadata and has no overlapping room nights');
 console.log(`${count} operator sample tests passed; only local isolated PostgreSQL/WASM, no cloud database or model calls.`);
}
checkIsolatedDatabase().catch(error=>{console.error(error);process.exitCode=1});
