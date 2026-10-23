const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const js=ts.transpileModule(fs.readFileSync('src/lib/business-analysis.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
const mod={exports:{}};new Function('exports','require',js)(mod.exports,require);const {businessAnalysis}=mod.exports;
function fixture(counts,active=5){return {daily:counts.map((booked,i)=>({date:`2026-10-${23+i}`,booked,capacity:active,available:active-booked})),capacity_room_nights:counts.length*active,booked_room_nights:counts.reduce((a,b)=>a+b,0),available_room_nights:counts.reduce((a,b)=>a+active-b,0),inactive_booked_room_nights:0};}
assert.match(businessAnalysis(fixture([2,2,1,0,0,0,0]),true).evidence,/连续 4 天/);
assert.match(businessAnalysis(fixture([2,2,1,0,0,0,0]),false).evidence,/4 consecutive days/);
assert.match(businessAnalysis(fixture([0,0]),true).title,/尚无预订/);
assert.match(businessAnalysis(fixture([0,0],0),true).title,/补齐可售客房/);
assert.match(businessAnalysis(fixture([5,5]),true).title,/已订满/);
assert.match(businessAnalysis(fixture([2,0,5]),true).evidence,/1 天已订满/);
assert.match(businessAnalysis(fixture([1,2,3]),true).title,/每天已有预订/);
const risk=fixture([2,0]);risk.inactive_booked_room_nights=3;assert.match(businessAnalysis(risk,true).risk,/3 间夜/);
assert.equal(businessAnalysis(fixture([1]),true).risk,null);
console.log('PASS business interpretation: early concentration, gaps, full, empty, no inventory, inactive risk and bilingual evidence.');
