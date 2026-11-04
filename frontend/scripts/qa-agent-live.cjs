// Explicit live smoke test; never run as part of build or the offline suite.
// Uses only the configured fictional demo, and writes diagnosis records only.
const assert=require('node:assert/strict'),fs=require('node:fs');
require('@next/env').loadEnvConfig(process.cwd(),true);
const {createServerClient}=require('@supabase/ssr');
const base=process.env.QA_BASE||'http://127.0.0.1:3115';
(async()=>{
 assert(process.env.DEMO_LOGIN_EMAIL&&process.env.DEMO_LOGIN_PASSWORD,'Configured demo required');
 const jar=new Map(),client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>jar.set(name,value))}});
 const signed=await client.auth.signInWithPassword({email:process.env.DEMO_LOGIN_EMAIL,password:process.env.DEMO_LOGIN_PASSWORD});assert(!signed.error,'Demo authentication failed');
 try{
  const headers={Origin:base,'Content-Type':'application/json',cookie:[...jar].map(([name,value])=>name+'='+value).join('; ')};
  const read=async path=>{const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);return r.json()};
  const profile=await read('/api/workspace/profile');assert.match(profile.profile?.name||'',/虚构|演示/,'Refuse live test on a non-fictional property');
  const before=await read('/api/workspace/bookings');
  const response=await fetch(base+'/api/workspace/agent',{method:'POST',headers,body:JSON.stringify({language:'zh',...(process.env.QA_FORCE_AGENT==='1'?{force:true}:{})}),signal:AbortSignal.timeout(100000)});
  const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
  fs.mkdirSync('../tmp/workbench-qa',{recursive:true});fs.writeFileSync('../tmp/workbench-qa/live-agent-result.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({id:result.run?.id,engine:result.run?.engine,status:result.run?.status,cached:result.cached,historyAvailable:result.historyAvailable,steps:result.run?.steps,summary:result.run?.summary,limitations:result.run?.limitations},null,2));
  assert.equal(result.run?.engine,'model_v1','A rule fallback does not pass the live Agent acceptance');
  assert(result.run.steps.filter(step=>step.tool&&step.status==='completed').length>=3,'Expected an investigation beyond seeded metrics and inventory');
  assert(result.run.findings.every(f=>f.evidenceIds.length&&f.evidenceIds.every(id=>result.run.evidence.some(e=>e.id===id))));
  const history=await read('/api/workspace/agent?view=history');assert(history.history.some(row=>row.id===result.run.id),'Run must persist in owner history');
  const detail=await read('/api/workspace/agent?id='+result.run.id);assert.equal(detail.run.id,result.run.id);assert(detail.task.status!=='running');
  const after=await read('/api/workspace/bookings');assert.deepEqual(after.bookings,before.bookings,'Diagnosis must not modify bookings');
  console.log('PASS live model-led investigation, evidence references, persisted owner history and unchanged fictional bookings. Real model/provider calls may have been used.');
 }finally{await client.auth.signOut({scope:'local'})}
})().catch(e=>{console.error(e.message);process.exitCode=1});
