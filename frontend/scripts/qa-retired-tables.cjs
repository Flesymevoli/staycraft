// Full historical schema in local PostgreSQL/WASM; no hosted data or model calls.
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const migration='20261117152350_archive_retired_guest_tables.sql';
const folder=path.resolve(__dirname,'../../supabase/migrations');
const archiveSql=fs.readFileSync(path.join(folder,migration),'utf8');
const tables=['conversations','messages','reply_drafts','reply_automation_settings','reply_automation_events','property_inventory','property_memberships'];
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_user)$$;
 grant usage on schema auth,storage to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to anon,authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 for(const file of fs.readdirSync(folder).filter(x=>x.endsWith('.sql')&&x<migration).sort()){
  try{await db.exec(fs.readFileSync(path.join(folder,file),'utf8'));}catch(e){throw Error(file+': '+e.message)}
 }
 const property='10000000-0000-4000-8000-000000000001',owner='20000000-0000-4000-8000-000000000001';
 const thread='30000000-0000-4000-8000-000000000001',message='40000000-0000-4000-8000-000000000001';
 const profile={name:'隔离验收民宿',location:'隔离地址',roomCount:'1',breakfast:'',checkin:'14:00',notes:''};
 await db.query('insert into auth.users(id) values($1)',[owner]);
 await db.query('insert into properties(id,name,owner_user_id) values($1,$2,$3)',[property,profile.name,owner]);
 await db.query('insert into property_details(property_id,profile) values($1,$2)',[property,JSON.stringify(profile)]);
 await db.query("insert into property_memberships(property_id,user_id,role) values($1,$2,'owner')",[property,owner]);
 await db.query("insert into property_inventory(property_id,inventory) values($1,'{\"types\":[],\"rooms\":[]}')",[property]);
 await db.query("insert into conversations(property_id,id,guest_hash) values($1,$2,repeat('1',64))",[property,thread]);
 await db.query("insert into messages(property_id,conversation_id,id,sender,body,request_id) values($1,$2,$3,'guest','历史测试消息',gen_random_uuid())",[property,thread,message]);
 await db.query("insert into reply_drafts(property_id,conversation_id,message_id,source_version,language,mode,question,decision) values($1,$2,$3,'old','zh','rules_v1','历史问题','{\"sent\":false,\"disposition\":\"needs_review\"}')",[property,thread,message]);
 await db.query('insert into reply_automation_settings(property_id) values($1)',[property]);
 await db.query("insert into reply_automation_events(property_id,conversation_id,message_id,state,reason,source_version,settings_revision) values($1,$2,$3,'handoff','old','old',gen_random_uuid())",[property,thread,message]);
 const inv={types:[{id:'50000000-0000-4000-8000-000000000001',name:'大床房',beds:'大床',capacity:2,price:300,photo:''}],rooms:[{id:'60000000-0000-4000-8000-000000000001',typeId:'50000000-0000-4000-8000-000000000001',number:'101',floor:'1',active:true}]};
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
 await db.query('select public.save_room_inventory($1,$2,null)',[property,JSON.stringify(inv)]);
 const order={channel:'ctrip',externalId:'ARCHIVE-KEEP-1',roomType:'大床房',roomNumber:'101',arrival:'2026-10-01',departure:'2026-10-03',status:'completed',totalCents:60000,currency:'CNY',sourceUpdatedAt:'2026-10-04T00:00:00Z'};
 const importOrder=async(save,revision=null)=>(await db.query('select public.process_booking_import($1,$2,$3,$4,false) value',[property,JSON.stringify([order]),save,revision])).rows[0].value;
 const preview=await importOrder(false);await importOrder(true,preview.revision);
 const metrics=async()=>(await db.query('select public.get_booking_metrics_range($1,$2,$3) value',[property,'2026-10-01','2026-10-03'])).rows[0].value;
 const metricsBefore=await metrics();assert.equal(metricsBefore.amount_cents,60000);
 await db.exec('reset role');
 const activeTables=['properties','property_details','room_types','rooms','direct_bookings','booking_import_batches','booking_import_tasks','operation_activity'];
 const activeBefore={};for(const table of activeTables)activeBefore[table]=(await db.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows;
 const retiredNames=['direct_booking_api','guest_message_api','guest_reply_automation','guest_property_profile','control_reply_automation','reply_conversation','save_reply_draft','get_conversations','booking_photo_allowed','preserve_inventory_room_ids'];
 const archivedFns=(await db.query("select n.nspname,p.proname,oidvectortypes(p.proargtypes) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname=any($1)",[retiredNames])).rows;
 const before={};for(const table of tables)before[table]=(await db.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows;
 await db.exec('create table public.active_dependency(property_id uuid,message_id uuid,foreign key(property_id,message_id) references public.messages(property_id,id))');
 await assert.rejects(db.exec(archiveSql),/active table references legacy/);await db.exec('rollback');
 assert.equal((await db.query("select to_regnamespace('retired_legacy') n")).rows[0].n,null);
 await db.exec('drop table public.active_dependency');
 await db.exec('create view public.active_dependency as select body from public.messages');
 await assert.rejects(db.exec(archiveSql),/active view references legacy/);await db.exec('rollback');await db.exec('drop view public.active_dependency');
 await db.exec("create function public.active_dependency() returns bigint language sql as $$select count(*) from public.messages$$");
 await assert.rejects(db.exec(archiveSql),/Active function/);await db.exec('rollback');await db.exec('drop function public.active_dependency()');
 await db.exec(archiveSql);
 for(const table of activeTables)assert.deepEqual((await db.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows,activeBefore[table],table+' must remain unchanged');
 for(const table of tables){
  assert.equal((await db.query('select to_regclass($1) t',['public.'+table])).rows[0].t,null);
  assert.deepEqual((await db.query(`select to_jsonb(t) row from retired_legacy.${table} t order by to_jsonb(t)::text`)).rows,before[table]);
  for(const role of ['anon','authenticated','service_role']){
   assert.equal((await db.query("select has_table_privilege($1,$2,'SELECT') p",[role,'retired_legacy.'+table])).rows[0].p,false);
   assert.equal((await db.query("select has_any_column_privilege($1,$2,'SELECT') p",[role,'retired_legacy.'+table])).rows[0].p,false);
  }
 }
 for(const fn of archivedFns){
  assert.equal((await db.query('select to_regprocedure($1) p',[`${fn.nspname}.${fn.proname}(${fn.args})`])).rows[0].p,null);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') p",[role,`retired_legacy.${fn.nspname}_${fn.proname}(${fn.args})`])).rows[0].p,false);
 }
 assert.equal((await db.query("select count(*)::int n from pg_policy where polname='guest catalog room photos'")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from pg_policy where polname='account reads own room photos'")).rows[0].n,1);
 await db.query("insert into storage.objects(bucket_id,name) values('room-photos',$1)",[property+'/50000000-0000-4000-8000-000000000001.webp']);
 await db.exec('set role anon');assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,0);await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
 assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,1);
 await db.query("insert into storage.objects(bucket_id,name) values('room-photos',$1)",[property+'/owner-upload.webp']);
 assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,2);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('room-photos',$1)",['10000000-0000-4000-8000-000000000002/foreign.webp']),e=>e.code==='42501');
 assert.deepEqual(await metrics(),metricsBefore);
 assert.equal((await importOrder(false)).rows[0].action,'duplicate');
 const revision=(await db.query('select inventory_revision from properties where id=$1',[property])).rows[0].inventory_revision;
 const saved=(await db.query('select public.save_room_inventory($1,$2,$3) value',[property,JSON.stringify(inv),revision])).rows[0].value;
 assert.equal(saved.inventory.rooms[0].number,'101');
 assert.equal((await db.query('select public.get_room_inventory($1) value',[property])).rows[0].value.inventory.types[0].price,300);
 assert.deepEqual((await db.query('select profile from property_details where property_id=$1',[property])).rows[0].profile,profile);
 await assert.rejects(db.query('select * from retired_legacy.messages'),e=>e.code==='42501');
 await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",['20000000-0000-4000-8000-000000000002']);await db.exec('set role authenticated');
 assert.equal((await db.query('select count(*)::int n from rooms')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from storage.objects')).rows[0].n,0);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('room-photos',$1)",[property+'/foreign-upload.webp']),e=>e.code==='42501');
 console.log(`PASS legacy cleanup: ${tables.length} tables and ${archivedFns.length} functions archived, records retained, table/column/function access revoked, dependency guards roll back, owner inventory/photo access preserved and cross-account access denied.`);
}finally{await db.close()}})().catch(e=>{console.error(e.stack,e.where||"");process.exitCode=1});
