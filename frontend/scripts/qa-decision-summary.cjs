const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const m={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/decision-summary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const base={rate_min:520,rate_max:760,active_rooms:5,booked_order_room_nights:4,booked_room_nights:4,capacity_room_nights:5,booked_pct:80,available_room_nights:1,inactive_booked_room_nights:0,daily:[{date:'2026-11-03',available:1}]};
const result=m.exports.decisionSummary(base,true);assert.match(result.price,/暂维持现价/);assert(!result.price.includes("5%"));assert.match(result.price,/当前挂牌价 ¥520–760/);assert.match(result.items[0].action,/容量 5 间夜，已订 4 间夜/);assert.equal(result.items.length,1);assert.match(result.items[0].title,/不建议整体降价/);assert(!JSON.stringify(result).includes('先保障'));
for(const change of [{historical_inventory_unknown:true},{booked_order_room_nights:0},{rate_min:null},{booked_pct:101},{available_room_nights:0}]){assert.match(m.exports.decisionSummary({...base,...change},true).price,/暂维持现价/)}
assert.match(m.exports.decisionSummary({...base,booked_pct:20},true).price,/暂维持现价/);assert.match(m.exports.decisionSummary(base,false).price,/Suggested pricing/);
console.log('PASS decision price, recorded counts/dates, no unsupported repricing and hold guards.');
