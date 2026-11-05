const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.properties(id uuid primary key,owner_user_id uuid not null);
 grant select on public.properties to authenticated;alter table public.properties enable row level security;
 create policy owner on public.properties for select to authenticated using(owner_user_id=(select auth.uid()));`);
 await db.exec(fs.readFileSync('../supabase/migrations/20261104000100_decision_agent_runs.sql','utf8'));
 const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',property='20000000-0000-4000-8000-000000000001',second='20000000-0000-4000-8000-000000000002';
 await db.query('insert into properties values($1,$2),($3,$4)',[property,owner,second,other]);
 const sign=async user=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated')};
 await sign(owner);
 const record=async(prop=property,language='zh')=>db.query("insert into decision_agent_runs(property_id,language,fingerprint,period_start,period_end) values($1,$2,$3,'2026-11-04','2026-11-10') returning id",[prop,language,'a'.repeat(64)]);
 const id=(await record()).rows[0].id;
 await assert.rejects(record(),/unique constraint/,'Concurrent requests must not create two running tasks');
 await assert.rejects(record(second),/row-level security/);
 await db.query("update decision_agent_runs set steps=$2,status='completed',engine='model_v1',result=$3,completed_at=now() where id=$1",[id,JSON.stringify([{id:'step-1',tool:'get_metrics'}]),JSON.stringify({summary:'A factual diagnosis',evidence:[]})]);
 assert.equal((await db.query('select status,steps,result from decision_agent_runs where id=$1',[id])).rows[0].status,'completed');
 const nextId=(await record()).rows[0].id; // A completed task must release the unique running slot.
 const snapshot={summary:'Snapshot-backed diagnosis',dailyMetrics:[{date:'2026-11-08',booked:1,capacity:5,available:4,bookedPct:20,amountCents:50000}],findings:[{id:'finding-1',action:'Review a promotion for the open night.',nextAction:{kind:'plan_promotion',target:'promotion',period:{start:'2026-11-08',end:'2026-11-08'},evidenceIds:['e1']}}],evidence:[{id:'e1',kind:'metrics',period:{start:'2026-11-04',end:'2026-11-10'}},{id:'e2',kind:'market',period:{start:'2026-11-07',end:'2026-11-08'},periodEnd:'exclusive'}]};
 await db.query("update decision_agent_runs set status='completed',engine='model_v1',result=$2,completed_at=now() where id=$1",[nextId,JSON.stringify(snapshot)]);
 assert.deepEqual((await db.query('select result from decision_agent_runs where id=$1',[nextId])).rows[0].result,snapshot);
 assert.deepEqual((await db.query('select result from decision_agent_runs where id=$1',[id])).rows[0].result,{summary:'A factual diagnosis',evidence:[]});
 await assert.rejects(db.query('update decision_agent_runs set property_id=$1 where id=$2',[second,id]),/row-level security/);
 await assert.rejects(db.query('delete from decision_agent_runs where id=$1',[id]),/permission denied/);
 await sign(other);assert.equal((await db.query('select * from decision_agent_runs')).rows.length,0);
 assert.equal((await db.query("update decision_agent_runs set status='failed' where id=$1 returning id",[id])).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from decision_agent_runs'),/permission denied/);
 console.log('PASS isolated diagnosis persistence, old/new result compatibility, daily/action/market-end snapshots, progress/final result, concurrent-run uniqueness, owner scope, reassignment/cross-account/anonymous/delete denial. No hosted writes.');
 }finally{await db.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
