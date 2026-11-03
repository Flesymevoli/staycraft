const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {createSample}=require('./operator-sample-data.cjs');
for(const anchor of ['2026-11-03','2026-01-01','2026-12-31']){
 const s=createSample(anchor,{rich:true});assert(s.bookings.length>80);assert(s.profile.location.includes('沙溪古镇'));assert(s.profile.location.includes('虚构'));
 assert(new Set(s.bookings.map(b=>b.id)).size===s.bookings.length);
 for(const b of s.bookings){assert(b.arrival<b.departure);assert(b.created_at.slice(0,10)<=anchor);assert(b.guest_name.includes('虚构'));if(b.stay_state==='completed'){assert(b.checked_in_at&&b.checked_out_at);assert(b.departure<anchor)}}
 for(const a of s.bookings.filter(b=>b.status==='confirmed'))for(const b of s.bookings.filter(b=>b.status==='confirmed'&&b.id!==a.id&&b.room_id===a.room_id))assert(!(a.arrival<b.departure&&a.departure>b.arrival),'overlap '+a.id+' '+b.id);
 assert(s.bookings.some(b=>b.stay_state==='completed'));assert(s.bookings.some(b=>b.refund_result==='review_pending'));assert(s.bookings.some(b=>b.status==='cancelled'));assert(s.bookings.some(b=>b.arrival>anchor));
 console.log('Rich fictional data:',anchor,s.bookings.length,'orders; historical/current/future states and non-overlap passed.');
}
const m={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/booking-chart.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const data={daily:[{booked_pct:40,booked:2,amount_cents:10001,order_room_nights:2},{booked_pct:0,booked:0,amount_cents:0,order_room_nights:0}]};
assert.deepEqual(m.exports.bookingChartValues(data,'occupancy'),[40,0]);assert.deepEqual(m.exports.bookingChartValues(data,'booking'),[2,0]);assert.deepEqual(m.exports.bookingChartValues(data,'amount'),[100.01,0]);assert.deepEqual(m.exports.bookingChartValues(data,'adr'),[50.005,null]);assert(m.exports.chartMaximum([100.01,0],'amount')>=100.01);
console.log('PASS unified chart data: four series, cents, zero amount and missing ADR distinguished.');
