const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
function load(name){const file=path.resolve(__dirname,'../src/lib/'+name+'.ts'),mod=new Module(file);mod.paths=module.paths;mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return mod.exports}
const file=path.resolve(__dirname,'../../deliverables/demo-day/2026-11-18/StayCraft-DemoDay-20261118-虚构经营订单.csv');
const csv=load('booking-csv').previewBookingCsv(fs.readFileSync(file,'utf8'));
assert.equal(csv.errors.length,0);assert.equal(csv.duplicates.length,0);assert.equal(csv.valid.length,326);
const finalRows=csv.valid.map(r=>r.booking);
const early=load('booking-csv').previewBookingCsv(fs.readFileSync(file,'utf8'),'2026-11-13');
assert.equal(early.canCommit,false,'Demo Day completed stays cannot be imported before departure');
assert(early.errors.length>0&&early.errors.every(e=>e.reason==='completed_in_future'));
for(const error of early.errors){const original=csv.valid.find(r=>r.row===error.row);assert(original?.booking.status==='completed'&&original.booking.departure>'2026-11-13');}
assert.equal(load('booking-csv').previewBookingCsv(fs.readFileSync(file,'utf8'),'2026-11-18').canCommit,true);
const rehearsal=load('booking-csv').previewBookingCsv(fs.readFileSync(path.join(path.dirname(file),'StayCraft-现在排练-20261113-虚构经营订单.csv'),'utf8'));
assert.equal(load('booking-csv').previewBookingCsv(fs.readFileSync(path.join(path.dirname(file),'StayCraft-现在排练-20261113-虚构经营订单.csv'),'utf8'),'2026-11-13').canCommit,true);
assert.equal(rehearsal.errors.length,0);assert.equal(rehearsal.valid.length,326);
let rows=rehearsal.valid.map(r=>r.booking);
const sample={propertyId:'11111111-1111-4111-8111-111111111111',ownerId:'22222222-2222-4222-8222-222222222222',bookings:[]};
const inventory={types:[],rooms:[]};process.env.STAYCRAFT_QA_IMPORT_DB='1';
const db=require('./import-database-fixture.cjs')(sample,()=>inventory);
const call=async(commit,revision)=>{const response=await db.handle(new URL('https://fixture.invalid/rest/v1/rpc/process_booking_import'),{body:JSON.stringify({p_property:sample.propertyId,p_rows:rows,p_commit:commit,p_revision:revision??null,p_confirm_unversioned:false})},{id:sample.ownerId});const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body};
(async()=>{try{
 await db.setImportDay('2026-11-13');
 const preview=await call(false);await call(true,preview.revision);
 assert.equal(inventory.types.length,3);assert.equal(inventory.rooms.length,12);assert.equal(sample.bookings.length,326);
 assert(sample.bookings.filter(b=>b.status!=='cancelled').every(b=>b.room_id),'all active orders assigned');
 const originals=new Map(sample.bookings.map(b=>[b.external_id,{id:b.id,total:b.total,arrival:b.arrival,departure:b.departure,room_id:b.room_id}]));
 rows=finalRows;await db.setImportDay('2026-11-18');
 const update=await call(false);assert(update.rows.some(r=>r.action==='updated'));await call(true,update.revision);
 assert.equal(sample.bookings.length,326);assert.equal(inventory.rooms.length,12);
 for(const b of sample.bookings)assert.deepEqual({id:b.id,total:b.total,arrival:b.arrival,departure:b.departure,room_id:b.room_id},originals.get(b.external_id));
 const repeated=await call(false);assert(repeated.rows.every(r=>r.action==='duplicate'));await call(true,repeated.revision);assert.equal(sample.bookings.length,326);
 const revenue=load('agent-revenue').aggregateRevenue(sample.bookings,{start:'2026-11-11',end:'2026-11-17'},'2026-11-18');
 assert.equal(revenue.totals.completed.roomNights,54);assert(revenue.totals.completed.amountCny>0);
 const metricsResponse=await db.handle(new URL('https://fixture.invalid/rest/v1/rpc/get_booking_metrics_range'),{body:JSON.stringify({p_property:sample.propertyId,p_start:'2026-11-18',p_end:'2026-11-24'})},{id:sample.ownerId});const metrics=await metricsResponse.json();assert.equal(metricsResponse.status,200);assert.equal(metrics.booked_room_nights,30);
 const independent=rows.filter(r=>r.status==='completed').reduce((sum,r)=>{const all=(Date.parse(r.departure)-Date.parse(r.arrival))/86400000;const overlap=Math.max(0,(Math.min(Date.parse(r.departure),Date.parse('2026-11-18'))-Math.max(Date.parse(r.arrival),Date.parse('2026-11-11')))/86400000);return sum+Math.floor(r.totalCents/all)*overlap},0);
 // Revenue distributes any remainder cents per night. This independent floor
 // calculation must differ by less than one cent per included night.
 assert(Math.abs(independent-revenue.totals.completed.amountCents)<54);
 console.log(JSON.stringify({result:'PASS isolated PostgreSQL CSV import, auto rooms, assignment, reimport idempotency and demo-day metrics',orders:326,types:3,rooms:12,completed:revenue.totals.completed,future7:{nights:metrics.booked_room_nights,amountCents:metrics.amount_cents,occupancyPct:metrics.booked_pct},liveWrites:0}));
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
