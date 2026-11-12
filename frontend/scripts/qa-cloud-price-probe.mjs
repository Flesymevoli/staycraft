import assert from 'node:assert/strict';
import {probeCloudPage} from './probe-cloud-prices.mjs';
const base={token:'fixture-token',accountId:'0'.repeat(32)};
let calls=0;
const success=await probeCloudPage({...base,fetchImpl:async(url,options)=>{
 calls++;assert.equal(new URL(url).hostname,'api.cloudflare.com');
 const body=JSON.parse(options.body);assert.equal(body.url,'https://hotels.ctrip.com/hotels/2132616.html');
 assert.deepEqual(Object.keys(body).sort(),['gotoOptions','url']);
 return Response.json({success:true,result:'<h1>杭州沐曦</h1>'});
}});
assert.equal(calls,1);assert.equal(success.status,'html_received');assert.equal(success.roomOffersVerified,false);assert.equal(success.authenticated,false);
assert.ok(!JSON.stringify(success).includes(base.token));
const denied=await probeCloudPage({...base,fetchImpl:async()=>Response.json({success:false,errors:[{code:10000,message:'private detail'}]},{status:403})});
assert.deepEqual(denied,{status:'api_failed',httpStatus:403,codes:[10000]});
await assert.rejects(probeCloudPage({...base,accountId:'invalid'}),/configuration_missing/);
const invalid=await probeCloudPage({...base,fetchImpl:async()=>new Response('upstream error',{status:502})});
assert.equal(invalid.status,'invalid_response');
console.log('Cloud probe fixed destination, anonymous payload, single call, conservative result, secret exclusion and failure checks passed (mock only).');
