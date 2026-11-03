import assert from 'node:assert/strict';
const base=process.env.QA_BASE||'http://127.0.0.1:3112';
for(const path of ['/guest','/guest/book?property=00000000-0000-4000-8000-000000000001','/api/guest','/api/guest/photo','/api/workspace/automation','/api/workspace/conversations','/api/workspace/conversations/draft','/app/messages/123']){
 for(const method of ['GET','POST']){
  const r=await fetch(base+path,{method,redirect:'manual'});
  assert.equal(r.status,410,method+' '+path);
  assert.equal(r.headers.get('cache-control'),'no-store');
 }
}
assert.equal((await fetch(base+'/api/health')).status,200);
console.log('16 HTTP guest/message retirement checks and retained health endpoint passed; no data writes.');
