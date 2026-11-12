// Local PostgreSQL/WASM verification only: no hosted connection or application data.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript');
const migrations=path.join(__dirname,'../../supabase/migrations');
const sql=name=>fs.readFileSync(path.join(migrations,name),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/property-profile.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const profileModule={exports:{}};
new Function('exports','module',compiled)(profileModule.exports,profileModule);
const {validateProfile,profileForStorage}=profileModule.exports;
const uidA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',uidB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const propA='cccccccc-cccc-4ccc-8ccc-cccccccccccc',propB='dddddddd-dddd-4ddd-8ddd-dddddddddddd',propC='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const legacy={name:'Checkout QA',location:'Fictional test location',roomCount:'4',breakfast:'07:00–10:00',checkin:'15:00',notes:'Existing note'};
const checks=[];
const check=(name,value)=>{assert(value,name);checks.push(name)};
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
   create table public.properties(id uuid primary key,owner_user_id uuid not null);
   create table public.property_memberships(property_id uuid,user_id uuid,role text);
   create table public.property_inventory(property_id uuid);
   create table public.direct_bookings(property_id uuid);
   alter table public.properties enable row level security;
   grant select on public.properties to authenticated;
   create policy "account reads own property" on public.properties for select to authenticated using(owner_user_id=(select auth.uid()));`);
  await db.exec(sql('20261021174207_property_details.sql'));
  await db.exec(sql('20261023155131_guest_property_profile.sql'));
  await db.exec(`drop policy "members read property details" on public.property_details;
   drop policy "members insert property details" on public.property_details;
   drop policy "members update property details" on public.property_details;`);
  const ownership=sql('20261022011553_single_account_property.sql');
  const ownershipStart=ownership.indexOf('do $$ declare target');
  await db.exec(ownership.slice(ownershipStart,ownership.indexOf('end $$;',ownershipStart)+7));
  await db.query('insert into public.properties values ($1,$2),($3,$4),($5,$4)',[propA,uidA,propB,uidB,propC]);
  await db.query('insert into public.property_details(property_id,profile) values($1,$2),($3,$4)',[propA,JSON.stringify(legacy),propB,JSON.stringify({...legacy,guestNotes:'Public guest note'})]);
  const beforeRows=(await db.query('select * from property_details order by property_id')).rows;
  const security=async()=>({
   table:(await db.query("select relrowsecurity,relforcerowsecurity,relacl::text from pg_class where oid='public.property_details'::regclass")).rows,
   policies:(await db.query("select policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='property_details' order by policyname")).rows,
   projection:(await db.query("select pg_get_functiondef('private.guest_property_profile(uuid)'::regprocedure) definition")).rows,
  });
  const beforeSecurity=await security();
  const reject=async(name,query,params,code)=>{
   let error;try{await db.query(query,params)}catch(value){error=value;}
   check(name,error?.code===code);
  };
  await reject('old constraint rejects a populated checkout key','update property_details set profile=$1 where property_id=$2',[JSON.stringify({...legacy,checkout:'12:00'}),propA],'23514');
  const normalized=validateProfile(legacy);
  check('legacy input still validates with an empty optional checkout',normalized?.checkout==='');
  const emptyStored=profileForStorage(normalized);
  check('empty optional checkout is omitted without mutating normalized input',!Object.hasOwn(emptyStored,'checkout')&&normalized.checkout==='');
  await db.query('update property_details set profile=$1 where property_id=$2',[JSON.stringify(emptyStored),propA]);
  check('empty checkout storage works before the migration',true);
  const filled=validateProfile({...legacy,checkout:'12:00'});
  check('nonempty checkout is retained, never silently discarded',profileForStorage(filled).checkout==='12:00');
  // Restore the exact old payload to prove migration does not rewrite existing records.
  await db.query('update property_details set profile=$1 where property_id=$2',[JSON.stringify(legacy),propA]);
  await db.exec(sql('20261112031217_property_checkout_time.sql'));
  assert.deepEqual((await db.query('select * from property_details order by property_id')).rows,beforeRows);
  check('migration preserves all old row values and revisions',true);
  assert.deepEqual(await security(),beforeSecurity);
  check('migration leaves RLS, grants, policies and public projection unchanged',true);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uidA]);await db.exec('set role authenticated');
  for(const value of [undefined,'','00:00','12:00','23:59']){
   const profile={...legacy,...(value===undefined?{}:{checkout:value})};
   await db.query('update property_details set profile=$1 where property_id=$2',[JSON.stringify(profile),propA]);
   assert.deepEqual((await db.query('select profile from property_details where property_id=$1',[propA])).rows[0].profile,profile);
   check(`accepts optional checkout ${value===undefined?'absent':JSON.stringify(value)} and reads it back`,true);
  }
  for(const value of [null,12,true,{},[],'24:00','12:60','9:00','12:00:00',' 12:00','12:00 ','\n12:00']){
   await reject(`rejects invalid checkout ${JSON.stringify(value)}`,'update property_details set profile=$1 where property_id=$2',[JSON.stringify({...legacy,checkout:value}),propA],'23514');
  }
  await reject('unknown profile fields remain rejected','update property_details set profile=$1 where property_id=$2',[JSON.stringify({...legacy,checkout:'12:00',extra:'not allowed'}),propA],'23514');
  await reject('existing check-in validation remains enforced','update property_details set profile=$1 where property_id=$2',[JSON.stringify({...legacy,checkin:'24:00',checkout:'12:00'}),propA],'23514');
  check('account A can only read its own profile',(await db.query('select property_id from property_details')).rows.length===1);
  check('account A cannot update account B profile',(await db.query('update property_details set profile=$1 where property_id=$2 returning property_id',[JSON.stringify({...legacy,checkout:'13:00'}),propB])).rows.length===0);
  await reject('account A cannot insert profile for account B property','insert into property_details(property_id,profile) values($1,$2)',[propC,JSON.stringify({...legacy,checkout:'13:00'})],'42501');
  await reject('account A cannot move profile to account B property','update property_details set property_id=$1 where property_id=$2',[propC,propA],'42501');
  await reject('authenticated role still has no delete permission','delete from property_details where property_id=$1',[propA],'42501');
  await db.exec('reset role;set role anon');
  await reject('anonymous role still cannot read profiles','select * from property_details',[],'42501');
  await db.exec('reset role');
  check('account B existing profile remains unchanged',JSON.stringify((await db.query('select profile from property_details where property_id=$1',[propB])).rows[0].profile)===JSON.stringify(beforeRows[1].profile));
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
