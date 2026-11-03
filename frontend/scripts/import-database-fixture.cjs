// Isolated PostgreSQL/WASM adapter for end-to-end tests, never imported by production.
const fs=require('node:fs'),path=require('node:path');
module.exports=function createImportDb(sample,getInventory){
 if(process.env.STAYCRAFT_QA_IMPORT_DB!=='1'||!sample)throw Error('isolated_import_fixture_only');
 const {PGlite}=require('@electric-sql/pglite');
 const db=new PGlite();
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 const ready=(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table properties(id uuid primary key,owner_user_id uuid,inventory_revision uuid);
 create table room_types(property_id uuid,id uuid,name text,price numeric,primary key(property_id,id));
 create table rooms(property_id uuid,id uuid,type_id uuid,number text,active boolean,housekeeping text,primary key(property_id,id));
 create table operation_activity(property_id uuid,kind text,resource_id uuid,room_number text not null,automatic boolean default false,completed boolean default true);`);
 const base=fs.readFileSync(path.join(__dirname,'../../supabase/migrations/20261022002812_direct_bookings.sql'),'utf8');
 await db.exec(base.slice(base.indexOf('create table public.direct_bookings'),base.indexOf('create index direct_bookings_room_dates')));
 await db.exec(`alter table direct_bookings drop constraint direct_bookings_refund_result_check;
 alter table direct_bookings add constraint direct_bookings_refund_result_check check(refund_result in ('auto_cancelled','review_pending','review_approved','review_rejected'));
 alter table direct_bookings add column stay_state text not null default 'pending',add column checked_in_at timestamptz,add column checked_out_at timestamptz;
 create function private.record_operation_activity() returns trigger language plpgsql as $$begin return new;end$$;
 create trigger booking_operation_activity after insert or update on direct_bookings for each row execute function private.record_operation_activity();
 alter table properties enable row level security;alter table direct_bookings enable row level security;
 grant select on properties,rooms,room_types,direct_bookings to authenticated;
 create policy own_property on properties for select to authenticated using(owner_user_id=auth.uid());
 create policy own_booking on direct_bookings for select to authenticated using(exists(select 1 from properties p where p.id=property_id and p.owner_user_id=auth.uid()));`);
 for(const file of ['20261103000200_booking_import.sql','20261103000300_import_metrics.sql','20261103000400_import_stay_guard.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../../supabase/migrations',file),'utf8'));
 await db.query('insert into properties(id,owner_user_id) values($1,$2)',[sample.propertyId,sample.ownerId]);
 await syncInventory();
 for(const b of sample.bookings)await db.query(`insert into direct_bookings(id,property_id,guest_hash,request_id,room_id,type_id,room_number,type_name,arrival,departure,guest_name,phone,expected_arrival,nightly_rate,total,status,refund_result) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'00000000',$12,$13,$14,$15,$16)`,[b.id,sample.propertyId,'0'.repeat(64),b.id,b.room_id,b.type_id,b.room_number,b.type_name,b.arrival,b.departure,b.guest_name,b.expected_arrival,b.nightly_rate,b.total,b.status,b.refund_result]);
 for(const b of sample.bookings)if(b.stay_state&&b.stay_state!=='pending')await db.query('update direct_bookings set stay_state=$2,checked_in_at=$3,checked_out_at=$4 where id=$1',[b.id,b.stay_state,b.checked_in_at,b.checked_out_at]);
 })();
 async function syncInventory(){
  const inv=getInventory();
  for(const t of inv.types)await db.query('insert into room_types values($1,$2,$3,$4) on conflict(property_id,id) do update set name=excluded.name,price=excluded.price',[sample.propertyId,t.id,t.name,t.price]);
  for(const r of inv.rooms)await db.query('insert into rooms values($1,$2,$3,$4,$5,$6) on conflict(property_id,id) do update set number=excluded.number,active=excluded.active,housekeeping=excluded.housekeeping',[sample.propertyId,r.id,r.typeId,r.number,r.active,r.housekeeping]);
 }
 let chain=Promise.resolve();
 const handle=async(url,init,identity)=>{
  const rpc=url.pathname.split('/rpc/')[1],table=url.pathname.split('/').at(-1);
  if(!['process_booking_import','complete_import_task','get_booking_metrics','get_booking_metrics_range'].includes(rpc)&&!['booking_import_batches','booking_import_tasks'].includes(table))return;
  const run=async()=>{try{
   await ready;await db.exec('reset role');await syncInventory();await db.query("select set_config('request.jwt.claim.sub',$1,false)",[identity.id]);await db.exec('set role authenticated');
   if(rpc){
    const b=JSON.parse(init.body||'{}');let q,args;
    if(rpc==='process_booking_import'){q='select process_booking_import($1,$2,$3,$4,$5) result';args=[b.p_property,JSON.stringify(b.p_rows),b.p_commit,b.p_revision,b.p_confirm_unversioned]}
    else if(rpc==='complete_import_task'){q='select complete_import_task($1,$2) result';args=[b.p_property,b.p_task]}
    else if(rpc==='get_booking_metrics_range'){q='select get_booking_metrics_range($1,$2,$3) result';args=[b.p_property,b.p_start,b.p_end]}
    else{q='select get_booking_metrics($1,$2) result';args=[b.p_property,b.p_days]}
    const result=(await db.query(q,args)).rows[0].result;
    if(rpc==='process_booking_import'&&b.p_commit){
     const imported=(await db.query('select * from direct_bookings where external_id is not null')).rows;
     sample.bookings.splice(0,sample.bookings.length,...sample.bookings.filter(x=>!x.external_id),...imported.map(x=>({...x,arrival:x.arrival instanceof Date?x.arrival.toISOString().slice(0,10):String(x.arrival).slice(0,10),departure:x.departure instanceof Date?x.departure.toISOString().slice(0,10):String(x.departure).slice(0,10)})));
    }
    return json(result);
   }
   if(url.searchParams.get('property_id')!=='eq.'+sample.propertyId||identity.id!==sample.ownerId)return json([]);
   const completed=url.searchParams.get('completed_at');const where=table==='booking_import_tasks'?` and not withdrawn${completed==='is.null'?' and completed_at is null':completed==='not.is.null'?' and completed_at is not null':''}`:'';
   const rows=(await db.query(`select * from public.${table} where property_id=$1${where} order by ${table==='booking_import_tasks'?'scheduled_on':'imported_at desc'} limit 200`,[sample.propertyId])).rows;
   if(table==='booking_import_tasks')for(const task of rows)task.booking=(await db.query('select external_channel,external_id,room_number,type_name from direct_bookings where id=$1',[task.booking_id])).rows[0];
   const dateOnly=v=>v instanceof Date?v.toISOString().slice(0,10):String(v).slice(0,10);
   return json(rows.map(r=>({...r,...(r.scheduled_on?{scheduled_on:dateOnly(r.scheduled_on)}:{}),...(r.first_arrival?{first_arrival:dateOnly(r.first_arrival),last_departure:dateOnly(r.last_departure)}:{})})));
  }catch(error){return json({message:error.message},409)}};
  const pending=chain.then(run,run);chain=pending.catch(()=>{});return pending;
 };
 return {handle};
};
