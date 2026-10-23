// Produces a reviewed, one-time fictional data seed. Does not create Auth users,
// contact the cloud, reset data, or run SQL. Only demo@example.invalid is eligible.
const fs = require('node:fs');
process.chdir(require('node:path').resolve(__dirname,'..'));
const {createSample} = require('./operator-sample-data.cjs');
const sample = createSample('2000-01-10');
const offset = date => Math.round((Date.parse(date)-Date.parse(sample.anchor))/86400000);
const bookings = sample.bookings.map(row => ({...row,from:offset(row.arrival),to:offset(row.departure),stay:row.room_number==='103'?'checked_in':'pending'}));
for(let i=0;i<9;i++){
  const room=sample.inventory.rooms[i%5],type=sample.inventory.types.find(type=>type.id===room.typeId);
  bookings.push({room_id:room.id,type_id:type.id,room_number:room.number,type_name:type.name,from:-3-i*2,to:-2-i*2,guest_name:`历史住客${i+1}（虚构）`,expected_arrival:'18:00 前',nightly_rate:type.price,total:type.price,status:'confirmed',refund_result:null,stay:'completed'});
}
const profile={...sample.profile,guestNotes:'全屋禁烟。早餐位于一楼餐厅，请在公共区域保持安静。'};
const encode=value=>JSON.stringify(value); // All content below is fixed fictional fixture data.
const sql=`-- Generated fictional demo data only. Create/confirm the Auth account first.
-- Re-runs refuse nonempty properties; no reset/delete/overwrite of business data.
begin;
do $demo_seed$
declare owner_id uuid;demo_property uuid;room_row jsonb;type_row jsonb;booking_row jsonb;thread_id uuid;
 anchor_date date:=(now() at time zone 'Asia/Shanghai')::date;
 inventory jsonb:=$inventory$${encode(sample.inventory)}$inventory$;
 profile jsonb:=$profile$${encode(profile)}$profile$;
 bookings jsonb:=$bookings$${encode(bookings)}$bookings$;
begin
 perform pg_advisory_xact_lock(hashtext('staycraft-persistent-demo-v1'));
 select id into owner_id from auth.users where lower(email)='demo@example.invalid' and email_confirmed_at is not null;
 if owner_id is null then raise exception 'Create and confirm demo@example.invalid with the Auth admin interface first';end if;
 select id into demo_property from public.properties where owner_user_id=owner_id for update;
 if demo_property is null then
  insert into public.properties(owner_user_id,name) values(owner_id,profile->>'name') returning id into demo_property;
 end if;
 if exists(select 1 from public.property_details d where d.property_id=demo_property)
 or exists(select 1 from public.rooms r where r.property_id=demo_property)
 or exists(select 1 from public.room_types t where t.property_id=demo_property)
 or exists(select 1 from public.direct_bookings b where b.property_id=demo_property)
 or exists(select 1 from public.conversations c where c.property_id=demo_property) then
  raise exception 'Demo account is not empty; nothing overwritten. Inspect it instead of reseeding';
 end if;
 update public.properties p set name=profile->>'name',inventory_revision=gen_random_uuid() where p.id=demo_property;
 insert into public.property_details(property_id,profile) values(demo_property,profile);
 for type_row in select value from jsonb_array_elements(inventory->'types') loop
  insert into public.room_types(property_id,id,name,beds,capacity,price)
  values(demo_property,(type_row->>'id')::uuid,type_row->>'name',type_row->>'beds',(type_row->>'capacity')::smallint,(type_row->>'price')::numeric);
 end loop;
 for room_row in select value from jsonb_array_elements(inventory->'rooms') loop
  insert into public.rooms(property_id,id,type_id,number,floor,housekeeping,active)
  values(demo_property,(room_row->>'id')::uuid,(room_row->>'typeId')::uuid,room_row->>'number',room_row->>'floor',room_row->>'housekeeping',(room_row->>'active')::boolean);
 end loop;
 for booking_row in select value from jsonb_array_elements(bookings) loop
  insert into public.direct_bookings(property_id,guest_hash,request_id,room_id,type_id,room_number,type_name,arrival,departure,guest_name,phone,expected_arrival,nightly_rate,total,status,refund_result,refund_requested_at,stay_state,checked_in_at,checked_out_at,created_at)
  values(demo_property,encode(sha256(convert_to('fictional-demo-'||gen_random_uuid()::text,'UTF8')),'hex'),gen_random_uuid(),(booking_row->>'room_id')::uuid,(booking_row->>'type_id')::uuid,booking_row->>'room_number',booking_row->>'type_name',anchor_date+(booking_row->>'from')::integer,anchor_date+(booking_row->>'to')::integer,booking_row->>'guest_name','00000000000',booking_row->>'expected_arrival',(booking_row->>'nightly_rate')::numeric,(booking_row->>'total')::numeric,booking_row->>'status',booking_row->>'refund_result',case when booking_row->>'refund_result' is not null then now() else null end,booking_row->>'stay',case when booking_row->>'stay' in ('checked_in','completed') then (anchor_date+(booking_row->>'from')::integer+time '15:00') at time zone 'Asia/Shanghai' end,case when booking_row->>'stay'='completed' then (anchor_date+(booking_row->>'to')::integer+time '11:00') at time zone 'Asia/Shanghai' end,(anchor_date+(booking_row->>'from')::integer-1+time '12:00') at time zone 'Asia/Shanghai');
 end loop;
 insert into public.conversations(property_id,guest_hash,guest_name)
 values(demo_property,encode(sha256(convert_to('fictional-demo-conversation','UTF8')),'hex'),'示例住客（虚构）') returning id into thread_id;
 insert into public.messages(property_id,conversation_id,sender,body,request_id)
 values(demo_property,thread_id,'guest','我想提前到店，可以先寄存行李吗？',gen_random_uuid());
 -- Automatic replies remain off for this shared demonstration account until tested.
 raise notice 'Demo seeded: property %, six rooms, fourteen bookings, one conversation. Dates anchored to %',demo_property,anchor_date;
end $demo_seed$;
commit;
`;
if(process.argv.includes('--test')){
  const fixture=sql.replace('begin;','').replace(/commit;\s*$/,'').replaceAll('demo@example.invalid','seed-qa@example.invalid');
  const verification=`begin;
insert into auth.users(id,email,email_confirmed_at) values('cb000000-0000-4000-8000-000000000001','seed-qa@example.invalid',now());
${fixture}
do $verify$ declare p uuid;begin
 select id into p from public.properties where owner_user_id='cb000000-0000-4000-8000-000000000001';
 perform set_config('staycraft.test_demo_property',p::text,true);
 if (select count(*) from public.rooms where property_id=p)<>6 or (select count(*) from public.direct_bookings where property_id=p)<>14 or (select count(*) from public.direct_bookings where property_id=p and stay_state='completed')<>9 then raise exception 'demo counts wrong';end if;
 begin
  execute $reseed$${fixture}$reseed$;
  raise exception 'reseed unexpectedly accepted';
 exception when raise_exception then
  if sqlerrm not like 'Demo account is not empty%' then raise;end if;
 end;
 if (select count(*) from public.direct_bookings where property_id=p)<>14 then raise exception 'reseed changed existing data';end if;
end $verify$;
select set_config('request.jwt.claim.sub','cb000000-0000-4000-8000-000000000099',true);
set local role authenticated;
do $isolation$ begin
 if exists(select 1 from public.rooms where property_id=current_setting('staycraft.test_demo_property')::uuid) then raise exception 'cross-account demo data visible';end if;
end $isolation$;
reset role;
rollback;
`;
  fs.writeFileSync('qa-persistent-demo-seed-test.sql',verification);
  console.log('Prepared rollback-only seed test: fictional Auth fixture, counts, reseed refusal and account isolation. No cloud execution.');
}else{
  fs.writeFileSync('qa-persistent-demo-seed.sql',sql);
  console.log('Prepared qa-persistent-demo-seed.sql: fictional data only, guarded demo email, no Auth creation and no cloud execution.');
}
