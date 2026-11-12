// Isolated transport regression: no network, model calls, or business writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const cache=new Map();
function load(file){
 file=path.resolve(__dirname,'../src/lib',file);
 if(cache.has(file))return cache.get(file);
 const mod={exports:{}};cache.set(file,mod.exports);
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',source)(name=>name==='server-only'?{}:name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),mod,mod.exports);
 return mod.exports;
}
const {desktopModelTransport}=load('desktop-model.ts');
const {modelChat}=load('model-provider.ts');
const {operatorModelEnabled}=load('operator-sample.ts');
const keys=['STAYCRAFT_DESKTOP_RUNTIME','STAYCRAFT_HOSTED','STAYCRAFT_OPERATOR_SAMPLE','STAYCRAFT_QA_AUTH_FIXTURES','MODEL_ENABLED','FORMAL_MODEL_ENABLED','DEMO_LOGIN_EMAIL','STAYCRAFT_DESKTOP_AI_TEST','STAYCRAFT_DESKTOP_AI_TEST_ORIGIN'];
const original=Object.fromEntries(keys.map(k=>[k,process.env[k]])),fetchOriginal=global.fetch;
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',property='11111111-1111-4111-8111-111111111111';
let session,requests,refreshes,reply,currentUser;
const account={user:{id:user,email:'fixture@example.invalid'},propertyId:property,supabase:{auth:{
 getSession:async()=>({data:{session},error:null}),
 refreshSession:async()=>{refreshes++;session={...session,access_token:'new-access',expires_at:Math.floor(Date.now()/1000)+3600};return {data:{session},error:null}},
 getUser:async()=>({data:{user:{id:currentUser}},error:null}),
}}};
const body={model:'local-model-must-not-leave',stream:false,max_tokens:1300,messages:[{role:'user',content:'Fictional property facts'}]};
function reset(){
 for(const k of keys)delete process.env[k];process.env.STAYCRAFT_DESKTOP_RUNTIME='1';
 session={user:{id:user},access_token:'fixture-access',refresh_token:'never-forward-refresh',expires_at:Math.floor(Date.now()/1000)+3600};
 requests=[];refreshes=0;currentUser=user;reply=null;
 global.fetch=async(url,init)=>{
  assert.equal(url,'https://staycraft.online/desktop-api/v1/ai');
  const sent=JSON.parse(init.body),headers=new Headers(init.headers);
  requests.push(sent);assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(headers.get('authorization'),'Bearer '+session.access_token);
  assert.equal(headers.has('cookie'),false);assert.equal(init.body.includes('never-forward-refresh'),false);assert.equal(sent.body.model,undefined);
  return reply?reply(sent):Response.json({version:1,userId:user,propertyId:property,purpose:sent.purpose,provider:'course',fallback:false,completion:{choices:[{finish_reason:'stop',message:{content:'{"content":"test"}'}}]}});
 };
}
const checks=[];
async function check(name,run){reset();await run();checks.push(name)}
const send=(extra={})=>modelChat(body,{transport:desktopModelTransport(account),purpose:'promotion',...extra});
(async()=>{try{
 await check('routes through gateway without local key',async()=>{assert(operatorModelEnabled());const r=await send();assert.equal(r.provider,'course');assert.equal((await r.response.json()).choices[0].finish_reason,'stop');assert.equal(requests.length,1);assert.equal(requests[0].propertyId,property)});
 await check('honors explicit model-off switch',async()=>{process.env.MODEL_ENABLED='0';assert.equal(operatorModelEnabled(),false)});
 await check('sample does not use gateway',async()=>{process.env.STAYCRAFT_OPERATOR_SAMPLE='1';process.env.STAYCRAFT_QA_AUTH_FIXTURES='1';assert.equal(desktopModelTransport(account),undefined);assert.equal(operatorModelEnabled(),false)});
 await check('hosted does not use desktop gateway',async()=>{process.env.STAYCRAFT_HOSTED='1';assert.equal(desktopModelTransport(account),undefined)});
 await check('read-only demo does not use gateway',async()=>{process.env.DEMO_LOGIN_EMAIL=account.user.email;assert.equal(desktopModelTransport(account),undefined)});
 await check('refreshes expiring access token locally',async()=>{session.expires_at=Math.floor(Date.now()/1000)+10;await send();assert.equal(refreshes,1)});
 await check('blocks mismatched local account before sending',async()=>{session.user.id='other';await assert.rejects(send());assert.equal(requests.length,0)});
 await check('blocks remote account mismatch',async()=>{reply=sent=>Response.json({version:1,userId:'other',propertyId:property,purpose:sent.purpose});await assert.rejects(send())});
 await check('blocks remote scope mismatch',async()=>{reply=sent=>Response.json({version:1,userId:user,propertyId:'other',purpose:sent.purpose});await assert.rejects(send())});
 await check('blocks purpose mismatch',async()=>{reply=()=>Response.json({version:1,userId:user,propertyId:property,purpose:'report'});await assert.rejects(send())});
 await check('rechecks account after response',async()=>{currentUser='other';await assert.rejects(send())});
 for(const status of [401,403,429,503])await check('does not retry status '+status,async()=>{reply=()=>new Response('sensitive upstream diagnostic',{status});await assert.rejects(send(),/desktop_model_unavailable/);assert.equal(requests.length,1)});
 for(const code of ['model_rate_limited','rate_limited'])await check('preserves only recognized rate-limit enum '+code,async()=>{reply=()=>Response.json({version:1,error:code,detail:'must-not-escape'},{status:429});await assert.rejects(send(),error=>error.message==='model_rate_limited'&&!String(error).includes('must-not-escape'));assert.equal(requests.length,1)});
 await check('does not trust rate-limit code under another status',async()=>{reply=()=>Response.json({version:1,error:'model_rate_limited'},{status:500});await assert.rejects(send(),/desktop_model_unavailable/)});
 await check('does not expose unknown error bodies',async()=>{reply=()=>Response.json({version:1,error:'private-provider-diagnostic'},{status:429});await assert.rejects(send(),/desktop_model_unavailable/)});
 await check('bounds response bytes',async()=>{reply=()=>new Response('x'.repeat(262145),{headers:{'content-type':'application/json'}});await assert.rejects(send())});
 await check('rejects non-json response',async()=>{reply=()=>new Response('<html>bad</html>');await assert.rejects(send())});
 await check('canceled operation sends nothing',async()=>{const ctl=new AbortController();ctl.abort();await assert.rejects(send({signal:ctl.signal}));assert.equal(requests.length,0)});
 await check('test override cannot forward JWT to another host',async()=>{process.env.STAYCRAFT_DESKTOP_AI_TEST='1';process.env.STAYCRAFT_DESKTOP_AI_TEST_ORIGIN='https://example.com';await assert.rejects(send());assert.equal(requests.length,0)});
 console.log(JSON.stringify({passed:checks.length,network:'mock only',checks},null,2));
 }finally{global.fetch=fetchOriginal;for(const key of keys){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key]}}
})().catch(error=>{console.error(error);process.exitCode=1});
