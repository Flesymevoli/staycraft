const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/booking-period.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const {bookingPeriod}=m.exports;
assert.equal(bookingPeriod({}).days,7);assert.equal(bookingPeriod({days:'28'}).days,28);
for(const [start,end,days] of [['2026-10-24','2026-10-24',1],['2026-10-15','2026-11-14',31],['2024-01-01','2024-12-31',366],['2024-02-29','2024-03-01',2]]){
 const period=bookingPeriod({start,end});assert.equal(period.days,days);assert.equal(period.rpc,'get_booking_metrics_range');assert.deepEqual(period.args,{p_start:start,p_end:end});
}
for(const value of [{days:14},{start:'2026-02-30',end:'2026-03-01'},{start:'2026-10-24'},{start:'2026-10-25',end:'2026-10-24'},{start:'2026-01-01',end:'2027-01-02'},{start:'1999-12-31',end:'2000-01-01'},{start:null,end:null},{start:'2026-1-1',end:'2026-01-02'}])assert.equal(bookingPeriod(value),null);
console.log('PASS booking period: inclusive dates, leap years, 1–366-day bounds, invalid/partial/reversed dates, existing shortcuts.');
