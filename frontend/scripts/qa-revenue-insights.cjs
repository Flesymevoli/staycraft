const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const js=ts.transpileModule(fs.readFileSync('src/lib/revenue-preview.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;const m={exports:{}};new Function('exports',js)(m.exports);const {revenueDays,revenueInsights}=m.exports;
const base={id:'a',room:'101',type:'A',typeEn:'A',arrival:'2026-09-30',departure:'2026-10-03',totalCents:10000,status:'completed'};
const days=revenueDays('2026-10',[base,{...base,id:'b',type:'B',totalCents:10000},{...base,id:'c',totalCents:900000,status:'cancelled'},{...base,id:'d',status:'confirmed'}]);const result=revenueInsights(days);
assert.equal(result.total,13332);assert.equal(result.leaders.length,2);assert.equal(result.ranked[0].nights,2);assert.equal(result.earningDays,2);assert.equal(days[2].cents,0);assert.equal(result.topThree.reduce((s,d)=>s+d.cents,0),13332);assert.equal(revenueInsights(revenueDays('2026-08',[])).leaders.length,0);
console.log('PASS revenue contribution: cross-month cents, checkout exclusion, completed-only, tied leaders, empty month.');
