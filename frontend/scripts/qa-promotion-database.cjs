// Local-only PostgreSQL WASM harness. Never connects to a hosted database.
const {PGlite}=require(process.env.STAYCRAFT_PGLITE_MODULE||"@electric-sql/pglite"),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const db=new PGlite();try{
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
create table public.properties(id uuid primary key,owner_user_id uuid not null unique);
alter table properties enable row level security;grant select on properties to authenticated;
create policy own_property on properties for select to authenticated using(owner_user_id=(select auth.uid()));
insert into properties values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003');`);
await db.exec(fs.readFileSync('../supabase/migrations/20261030090350_promotion_workspace.sql','utf8'));
const sql=async(q,args)=>db.query(q,args),p1='10000000-0000-4000-8000-000000000001',p2='10000000-0000-4000-8000-000000000002',p3='10000000-0000-4000-8000-000000000003';
async function user(n){await db.exec('reset role');await sql("select set_config('request.jwt.claim.sub',$1,false)",['20000000-0000-4000-8000-00000000000'+n]);await db.exec('set role authenticated')}
async function rejects(q,args,code){await assert.rejects(sql(q,args),e=>e.code===code)}
await user(1);const row=(await sql('insert into promotion_workspaces(property_id) values($1) returning *',[p1])).rows[0];assert.equal(row.property_id,p1);
await rejects('insert into promotion_workspaces(property_id) values($1)',[p2],'42501');
await rejects('update promotion_workspaces set property_id=$1 where property_id=$2',[p3,p1],'42501');
await rejects('update promotion_workspaces set state=$1 where property_id=$2',[JSON.stringify({sources:[],drafts:[],extra:true}),p1],'23514');
assert.equal((await sql('update promotion_workspaces set revision=gen_random_uuid() where property_id=$1 and revision=$2 returning revision',[p1,row.revision])).rows.length,1);
assert.equal((await sql('update promotion_workspaces set revision=gen_random_uuid() where property_id=$1 and revision=$2 returning revision',[p1,row.revision])).rows.length,0);
await rejects('delete from promotion_workspaces where property_id=$1',[p1],'42501');
await user(2);assert.equal((await sql('select * from promotion_workspaces')).rows.length,0);await sql('insert into promotion_workspaces(property_id) values($1)',[p2]);assert.equal((await sql('select * from promotion_workspaces')).rows.length,1);assert.equal((await sql('update promotion_workspaces set revision=gen_random_uuid() where property_id=$1 returning *',[p1])).rows.length,0);
await db.exec('reset role;set role anon');await rejects('select * from promotion_workspaces',[],'42501');
console.log('PASS actual PostgreSQL migration in local WASM database: owner insert/read/update, cross-account read/write/reassignment denial, anonymous and delete denial, shape constraints and stale revision protection. No hosted writes.');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
