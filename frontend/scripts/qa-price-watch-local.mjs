// Read-only checks against the running local pilot. Never starts a collection.
import assert from 'node:assert/strict';
import {request} from 'node:http';
const base='http://127.0.0.1:3110/api/local/price-monitor';
const response=await fetch(base+'?view=observations');
assert.equal(response.status,200);
const view=await response.json();
assert.ok(Array.isArray(view.rows)&&Array.isArray(view.dates));
assert.equal(view.rows.length,view.dates.length*2);
assert.ok(view.rows.every(r=>/^https:\/\/hotels\.ctrip\.com\/hotels\/\d+\.html$/.test(r.sourceUrl)));
assert.ok(view.rows.every(r=>!('authScope' in r)&&!('snapshot' in r)));
const outsideHost=await new Promise((resolve,reject)=>{const req=request(base,{headers:{Host:'outside.invalid'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});
assert.equal(outsideHost,404);
assert.equal((await fetch(base,{method:'POST',headers:{Origin:'https://outside.invalid'}})).status,403);
console.log('7 local read-model and request-boundary checks passed; no collection started');
const connectionResponse=await fetch(base+'?view=connection');
assert.equal(connectionResponse.status,200);
const connection=await connectionResponse.json();
assert.ok(['not_opened','opening','open','closed','failed'].includes(connection.state));
assert.equal(typeof connection.locked,'boolean');
assert.deepEqual(Object.keys(connection).sort(),['locked','state']);
console.log('4 connection-status response and credential exclusion checks passed');
const exported=await fetch(base+'?view=export');
assert.equal(exported.status,200);
assert.match(exported.headers.get('content-type'),/text\/csv/);
assert.equal(exported.headers.get('cache-control'),'no-store');
assert.match(exported.headers.get('content-disposition'),/attachment/);
const csv=await exported.text();
assert.ok(csv.includes('人工核验结果(待填写)'));
assert.ok(!csv.includes('member:')&&!csv.includes('snapshot'));
assert.equal(csv.trim().split('\r\n').length,view.rows.length+1);
for(const row of view.rows){
 assert.ok(csv.includes(row.sourceUrl));
 assert.ok(csv.includes(row.stayDate));
 if(row.amount!==null)assert.ok(csv.includes(`"${row.amount}"`));
}
console.log('Local CSV download, read-model parity and credential exclusion passed; no collection started.');
