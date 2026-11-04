const assert=require('node:assert/strict');
const {chromium}=require('./qa-browser.cjs');
const base=process.env.QA_BASE||'http://127.0.0.1:3114';
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const day=n=>new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
(async()=>{const browser=await chromium.launch();try{
 const context=await browser.newContext(),page=await context.newPage();
 await page.goto(base+'/login');await page.getByRole('button',{name:/体验演示|Try StayCraft/}).click();await page.waitForURL('**/app');
 const api=async(path,body)=>{const response=await context.request.post(base+path,{headers:{Origin:base},data:body});return {status:response.status(),body:await response.json()};};
 const get=async path=>{const r=await context.request.get(base+path);assert.equal(r.status(),200,path);return r.json();};
 const inventory=await get('/api/workspace/inventory'),before=await get('/api/workspace/bookings');
 let room,arrival;
 for(let offset=8;offset<27&&!room;offset++)for(const r of inventory.inventory.rooms.filter(r=>r.active))if(!before.bookings.some(b=>b.status!=='cancelled'&&(b.room_id===r.id||b.room_number===r.number)&&b.arrival<day(offset+1)&&b.departure>day(offset))){room=r;arrival=day(offset);break;}
 assert(room,'Expected one free room for the isolated import');
 const departure=new Date(Date.parse(arrival)+86400000).toISOString().slice(0,10),type=inventory.inventory.types.find(t=>t.id===room.typeId);
 const range='?start='+today+'&end='+day(27),metricsBefore=await get('/api/workspace/metrics'+range);
 const id='WB-ISOLATED-'+Date.now(),header='channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at';
 const csv=header+'\n'+['WORKBENCH-QA',id,type.name,room.number,arrival,departure,'confirmed',type.price,'CNY',new Date().toISOString()].join(',');
 const preview=await api('/api/workspace/booking-import',{csv,commit:false});assert.equal(preview.status,200);assert(preview.body.canCommit);assert.equal(preview.body.rows[0].action,'new');
 assert.equal((await get('/api/workspace/bookings')).bookings.length,before.bookings.length,'Preview must not write');
 const imported=await api('/api/workspace/booking-import',{csv,commit:true,revision:preview.body.revision});assert.equal(imported.status,200);assert(imported.body.saved);
 const after=await get('/api/workspace/bookings');assert.equal(after.bookings.length,before.bookings.length+1);for(const old of before.bookings)assert.deepEqual(after.bookings.find(b=>b.id===old.id),old);
 const metricsAfter=await get('/api/workspace/metrics'+range);assert.equal(metricsAfter.booked_room_nights,metricsBefore.booked_room_nights+1);assert.equal(metricsAfter.amount_cents,metricsBefore.amount_cents+Math.round(type.price*100));
 const duplicate=await api('/api/workspace/booking-import',{csv,commit:false});assert.equal(duplicate.body.rows[0].action,'duplicate');
 const report=await api('/api/workspace/agent',{});assert.equal(report.status,200);assert(report.body.run.evidence.length>0);assert(report.body.run.steps.length>0);assert.equal(report.body.run.engine,'rules_v1','Isolated preview must never claim a live model ran');
 const invalidOrigin=await context.request.post(base+'/api/workspace/agent',{headers:{Origin:'https://unrelated.invalid'},data:{}});assert.equal(invalidOrigin.status(),403);
 await context.clearCookies();const denied=await context.request.post(base+'/api/workspace/agent',{headers:{Origin:base},data:{}});assert.equal(denied.status(),401);
 console.log('PASS CSV preview/transaction/idempotency, preserved orders, statistics propagation, grounded agent fallback and auth/origin boundary. In-memory database only; no cloud writes.');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
