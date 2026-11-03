import assert from 'node:assert/strict';
import {buildPriceWatch} from '../src/lib/competitor-observations.ts';
import {priceWatchCsv} from '../src/lib/price-watch-export.ts';
const scope='member:00000000-0000-4000-8000-000000000001';
const item={authScope:scope,hotelId:'2132616',hotelName:'sample',sourceUrl:'https://hotels.ctrip.com/hotels/2132616.html',capturedAt:'2026-11-02T01:00:00Z',stayDate:'2026-11-04',amount:195,currency:'CNY',kind:'calendar_reference',status:'observed',rooms:1,adults:2,children:0,nights:1};
const job={status:'failed',startedAt:'2026-11-02T02:00:00Z',finishedAt:'2026-11-02T02:01:00Z',dates:['2026-11-04'],results:[{hotelId:'2132616',status:'failed',error:'verification_required'}]};
const watch=buildPriceWatch([item,{...item,authScope:'anonymous',amount:999}],job,scope,Date.parse(job.finishedAt));
const csv=priceWatchCsv(watch);
assert.ok(csv.startsWith('\uFEFF'));
assert.equal(csv.trim().split('\r\n').length,3); // Failed/missing samples must remain visible.
assert.ok(csv.includes('需要人工验证'));
assert.ok(csv.includes('"日历参考价","","需要人工验证"'));
assert.ok(csv.includes('"195","2026-11-02T01:00:00Z"'));
assert.ok(!csv.includes(scope)&&!csv.includes('999')&&!csv.includes('snapshot'));
assert.ok(csv.includes('人工核验结果(待填写)'));
watch.rows[0].hotelName='=HYPERLINK("bad")\nname';
assert.ok(priceWatchCsv(watch).includes('"\'=HYPERLINK(""bad"")\nname"'));
assert.equal(priceWatchCsv(buildPriceWatch([],{status:'idle'},'anonymous')).trim().split('\r\n').length,1);
console.log('CSV export: failed/missing rows, historical price separation, session isolation, formula escaping and empty state passed; fixtures only.');
