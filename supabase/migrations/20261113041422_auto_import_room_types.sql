begin;
-- CSV room types may initially lack base-rate and capacity information.
alter table public.room_types alter column price drop not null, alter column capacity drop not null;
create or replace function public.valid_property_inventory(doc jsonb, property uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
declare t jsonb; r jsonb;
begin
  if jsonb_typeof(doc) <> 'object' or not doc ?& array['types','rooms'] or (doc-array['types','rooms']) <> '{}'::jsonb
    or jsonb_typeof(doc->'types') <> 'array' or jsonb_typeof(doc->'rooms') <> 'array'
    or jsonb_array_length(doc->'types') > 20 or jsonb_array_length(doc->'rooms') > 200 or octet_length(doc::text)>160000 then return false; end if;
  for t in select value from jsonb_array_elements(doc->'types') loop
    if jsonb_typeof(t)<>'object' or not t ?& array['id','name','beds','capacity','price','photo'] or (t-array['id','name','beds','capacity','price','photo'])<>'{}'::jsonb
      or jsonb_typeof(t->'id')<>'string' or (t->>'id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or jsonb_typeof(t->'name')<>'string' or length(trim(t->>'name')) not between 1 and 60
      or jsonb_typeof(t->'beds')<>'string' or length(trim(t->>'beds')) not between 1 and 80
      or (jsonb_typeof(t->'capacity')<>'null' and (jsonb_typeof(t->'capacity')<>'number' or (t->>'capacity')::numeric not between 1 and 12 or (t->>'capacity')::numeric <> trunc((t->>'capacity')::numeric)))
      or (jsonb_typeof(t->'price')<>'null' and (jsonb_typeof(t->'price')<>'number' or (t->>'price')::numeric not between 0.01 and 99999 or (t->>'price')::numeric<>round((t->>'price')::numeric,2)))
      or jsonb_typeof(t->'photo')<>'string'
      or ((t->>'photo')<>'' and ((t->>'photo') !~* '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$' or split_part(t->>'photo','/',1)<>property::text)) then return false; end if;
  end loop;
  for r in select value from jsonb_array_elements(doc->'rooms') loop
    if jsonb_typeof(r)<>'object' or not r ?& array['id','number','floor','typeId','active'] or (r-array['id','number','floor','typeId','housekeeping','active'])<>'{}'::jsonb
      or jsonb_typeof(r->'id')<>'string' or (r->>'id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or jsonb_typeof(r->'number')<>'string' or length(trim(r->>'number')) not between 1 and 24
      or jsonb_typeof(r->'floor')<>'string' or length(trim(r->>'floor')) not between 1 and 30
      or jsonb_typeof(r->'active')<>'boolean'
      or not exists(select 1 from jsonb_array_elements(doc->'types') x where x->>'id'=r->>'typeId') then return false; end if;
  end loop;
  if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(doc->'types') x)
    or (select count(*)<>count(distinct x->>'id') or count(*)<>count(distinct lower(trim(x->>'number'))) from jsonb_array_elements(doc->'rooms') x) then return false; end if;
  return true;
exception when others then return false;
end $$;


create or replace function public.process_booking_import(p_property uuid,p_rows jsonb,p_commit boolean default false,p_revision uuid default null,p_confirm_unversioned boolean default false) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='15s' as $$
declare rev uuid;x jsonb;b public.direct_bookings;t uuid;r uuid;num text;result jsonb:='[]';action text;newid uuid;stamp timestamptz;v_generation text;batch uuid;new_types jsonb:='[]';unknown_rooms jsonb:='[]';today date:=(now() at time zone 'Asia/Shanghai')::date;
begin
 if (select auth.uid()) is null then raise exception 'sign_in_required';end if;
 if p_commit is null or p_confirm_unversioned is null then raise exception 'invalid_import_flags';end if;
 select booking_import_revision into rev from public.properties where id=p_property and owner_user_id=(select auth.uid()) for update;
 if not found then raise exception 'property_not_owned';end if;
 if p_commit and (p_revision is null or p_revision<>rev) then raise exception 'import_changed';end if;
 if p_rows is null or jsonb_typeof(p_rows) is distinct from 'array' or pg_column_size(p_rows)>1000000 then raise exception 'invalid_rows';end if;
 if jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'invalid_rows';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) e group by e->>'channel',e->>'externalId' having count(*)>1) then raise exception 'duplicate_identity';end if;
 for x in select value from jsonb_array_elements(p_rows) loop
  if not (x ?& array['channel','externalId','roomType','roomNumber','arrival','departure','status','totalCents','currency','sourceUpdatedAt'])
   or x->>'roomType' is null or length(trim(x->>'roomType')) not between 1 and 60 or x->>'status' is null or x->>'currency' is null or x->>'totalCents' is null or x->>'arrival' is null or x->>'departure' is null
   or x->>'channel' is null or length(x->>'channel') not between 1 and 80 or x->>'externalId' is null or length(x->>'externalId') not between 1 and 120
   or x->>'status' not in ('confirmed','cancelled','completed') or x->>'currency'<>'CNY'
   or (x->>'totalCents')::bigint not between 1 and 99999999999
   or (x->>'departure')::date<=(x->>'arrival')::date or (x->>'departure')::date>(x->>'arrival')::date+30 then raise exception 'invalid_row';end if;
  stamp:=(x->>'sourceUpdatedAt')::timestamptz;
  if x->>'status'='completed' and (x->>'departure')::date>today then raise exception 'invalid_row';end if;
  select * into b from public.direct_bookings where property_id=p_property and external_channel=x->>'channel' and external_id=x->>'externalId';
  if b.id is not null and b.external_snapshot-'sourceUpdatedAt'=x-'sourceUpdatedAt' then
   result:=result||jsonb_build_array(jsonb_build_object('channel',x->>'channel','externalId',x->>'externalId','action','duplicate'));
   if p_commit and stamp is not null and (b.source_updated_at is null or stamp>b.source_updated_at) then update public.direct_bookings set external_snapshot=x,source_updated_at=stamp,imported_at=clock_timestamp() where id=b.id;end if;
   continue;
  end if;
  if b.id is not null and x->>'status'='cancelled' then t:=b.type_id;r:=b.room_id;num:=b.room_number;else
  select id into t from public.room_types where property_id=p_property and name=x->>'roomType';
  if (select count(*) from public.room_types where property_id=p_property and name=x->>'roomType')>1 then raise exception 'room_type_unmatched';end if;
  if t is null then
   if not new_types @> jsonb_build_array(x->>'roomType') then new_types:=new_types||jsonb_build_array(x->>'roomType');end if;
   if (select count(*) from public.room_types where property_id=p_property)+(case when p_commit then 1 else jsonb_array_length(new_types) end)>20 then raise exception 'room_type_limit';end if;
   if p_commit then insert into public.room_types(property_id,id,name,beds,capacity,price,photo_path) values(p_property,gen_random_uuid(),x->>'roomType','待补充',null,null,'') returning id into t;end if;
  end if;
  r:=null;num:=null;
  if nullif(x->>'roomNumber','') is not null then
   select id,number into r,num from public.rooms where property_id=p_property and type_id=t and number=x->>'roomNumber' and active;
   if r is null then
    if exists(select 1 from public.rooms where property_id=p_property and number=x->>'roomNumber') then raise exception 'room_unmatched';end if;
    if not unknown_rooms @> jsonb_build_array(x->>'roomNumber') then unknown_rooms:=unknown_rooms||jsonb_build_array(x->>'roomNumber');end if;
   end if;
  end if;
  end if;
  if r is not null and x->>'status'='confirmed' and (
   exists(select 1 from public.direct_bookings other where other.property_id=p_property and other.room_id=r and other.id is distinct from b.id and other.status='confirmed' and other.stay_state<>'completed' and coalesce(other.external_snapshot->>'status','confirmed')='confirmed' and other.arrival<(x->>'departure')::date and other.departure>(x->>'arrival')::date)
   or exists(select 1 from jsonb_array_elements(p_rows) other where (other->>'channel',other->>'externalId')<>(x->>'channel',x->>'externalId') and other->>'roomNumber'=num and other->>'status'='confirmed' and (other->>'arrival')::date<(x->>'departure')::date and (other->>'departure')::date>(x->>'arrival')::date)
  ) then raise exception 'room_date_conflict';end if;
  action:='new';
  if b.id is not null then
   if b.stay_state<>'pending' then raise exception 'manual_stay_conflict';
   elsif b.source_updated_at is not null and stamp is not null and stamp<=b.source_updated_at then raise exception 'stale_source';
   elsif (stamp is null or b.source_updated_at is null) and not p_confirm_unversioned then raise exception 'confirm_unversioned';
   else action:=case when x->>'status'='cancelled' then 'cancelled' else 'updated' end;end if;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('channel',x->>'channel','externalId',x->>'externalId','action',action));
  if not p_commit then continue;end if;
  if b.id is null then
   insert into public.direct_bookings(property_id,type_id,type_name,room_id,room_number,arrival,departure,nightly_rate,total,status,external_channel,external_id,external_snapshot,source_updated_at,imported_at)
    values(p_property,t,x->>'roomType',r,num,(x->>'arrival')::date,(x->>'departure')::date,null,(x->>'totalCents')::numeric/100,case when x->>'status'='cancelled' then 'cancelled' else 'confirmed' end,x->>'channel',x->>'externalId',x,stamp,clock_timestamp()) returning id into newid;
  else
   newid:=b.id;
   update public.direct_bookings set type_id=t,type_name=x->>'roomType',room_id=r,room_number=num,arrival=(x->>'arrival')::date,departure=(x->>'departure')::date,nightly_rate=null,total=(x->>'totalCents')::numeric/100,status=case when x->>'status'='cancelled' then 'cancelled' else 'confirmed' end,external_snapshot=x,source_updated_at=stamp,imported_at=clock_timestamp() where id=newid;
  end if;
  -- Preserve completed tasks; supersede pending plans. No cleaning state is changed.
  update public.booking_import_tasks set withdrawn=true where property_id=p_property and booking_id=newid and completed_at is null;
  v_generation:=md5(x::text);
  if x->>'status'='confirmed' then
   insert into public.booking_import_tasks(property_id,booking_id,kind,scheduled_on,generation) values(p_property,newid,'arrival',(x->>'arrival')::date,v_generation),(p_property,newid,'departure',(x->>'departure')::date,v_generation) on conflict(property_id,booking_id,kind,generation) do update set withdrawn=false;
   if r is null then insert into public.booking_import_tasks(property_id,booking_id,kind,scheduled_on,generation) values(p_property,newid,'unassigned',(x->>'arrival')::date,v_generation) on conflict do nothing;end if;
  end if;
  if action in ('updated','cancelled') then insert into public.booking_import_tasks(property_id,booking_id,kind,scheduled_on,generation) values(p_property,newid,'changed',today,v_generation) on conflict do nothing;end if;
 end loop;
 if p_commit and jsonb_array_length(new_types)>0 then update public.properties set inventory_revision=gen_random_uuid() where id=p_property;end if;
 if p_commit then
  insert into public.booking_import_batches(property_id,counts,channels,first_arrival,last_departure)
   select p_property,(select jsonb_object_agg(a,n) from (select e->>'action' a,count(*) n from jsonb_array_elements(result) e group by e->>'action') q),(select jsonb_agg(distinct e->>'channel') from jsonb_array_elements(p_rows) e),(select min((e->>'arrival')::date) from jsonb_array_elements(p_rows) e),(select max((e->>'departure')::date) from jsonb_array_elements(p_rows) e) returning id into batch;
  update public.properties set booking_import_revision=gen_random_uuid() where id=p_property returning booking_import_revision into rev;
 end if;
 return jsonb_build_object('revision',rev,'rows',result,'saved',p_commit,'batchId',batch,'newRoomTypes',new_types,'unmatchedRooms',unknown_rooms);
end $$;

commit;
