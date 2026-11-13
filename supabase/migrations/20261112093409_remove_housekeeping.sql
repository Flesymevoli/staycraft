begin;

-- Cleaning state was stored in shared room records and the shared activity log.

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
      or jsonb_typeof(t->'capacity')<>'number' or (t->>'capacity')::numeric not between 1 and 12 or (t->>'capacity')::numeric <> trunc((t->>'capacity')::numeric)
      or jsonb_typeof(t->'price')<>'number' or (t->>'price')::numeric not between 0.01 and 99999 or (t->>'price')::numeric<>round((t->>'price')::numeric,2)
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

create or replace function private.inventory_document(p_property uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('types',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'beds',t.beds,'capacity',t.capacity,'price',t.price,'photo',t.photo_path) order by t.created_at,t.id) from public.room_types t where t.property_id=p.id),'[]'),
 'rooms',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'number',r.number,'floor',r.floor,'typeId',r.type_id,'active',r.active) order by r.created_at,r.id) from public.rooms r where r.property_id=p.id),'[]')) from public.properties p where p.id=p_property
$$;

create or replace function private.save_room_inventory(p_property uuid,p_inventory jsonb,p_revision uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare current_revision uuid; next_revision uuid:=gen_random_uuid(); item jsonb;
begin
 if (select auth.uid()) is null then raise exception 'sign_in_required';end if;
 select inventory_revision into current_revision from public.properties where id=p_property and owner_user_id=(select auth.uid()) for update;
 if not found then raise exception 'property_not_owned';end if;
 if current_revision is distinct from p_revision then raise exception 'inventory_changed';end if;
 if p_inventory is null or not public.valid_property_inventory(p_inventory,p_property) then raise exception 'invalid_inventory';end if;
 if exists(select 1 from public.rooms r where r.property_id=p_property and not exists(select 1 from jsonb_array_elements(p_inventory->'rooms') x where x->>'id'=r.id::text)) then raise exception 'archive_room_instead';end if;
 if exists(select 1 from public.room_types t where t.property_id=p_property and not exists(select 1 from jsonb_array_elements(p_inventory->'types') x where x->>'id'=t.id::text)) then raise exception 'preserve_room_type';end if;
 for item in select value from jsonb_array_elements(p_inventory->'types') loop
  insert into public.room_types(property_id,id,name,beds,capacity,price,photo_path) values(p_property,(item->>'id')::uuid,trim(item->>'name'),trim(item->>'beds'),(item->>'capacity')::smallint,(item->>'price')::numeric,item->>'photo')
   on conflict(property_id,id) do update set name=excluded.name,beds=excluded.beds,capacity=excluded.capacity,price=excluded.price,photo_path=excluded.photo_path;
 end loop;
 for item in select value from jsonb_array_elements(p_inventory->'rooms') loop
  insert into public.rooms(property_id,id,type_id,number,floor,active) values(p_property,(item->>'id')::uuid,(item->>'typeId')::uuid,normalize(trim(item->>'number'),NFKC),trim(item->>'floor'),(item->>'active')::boolean)
   on conflict(property_id,id) do update set type_id=excluded.type_id,number=excluded.number,floor=excluded.floor,active=excluded.active;
 end loop;
 update public.properties set inventory_revision=next_revision where id=p_property;
 return jsonb_build_object('inventory',private.inventory_document(p_property),'revision',next_revision);
end $$;

create or replace function private.change_booking_stay(p_property uuid,p_booking uuid,p_action text) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare b public.direct_bookings;r public.rooms;today date:=(now() at time zone 'Asia/Shanghai')::date;
begin
 if p_action is null or p_action not in ('checkin','checkout') then raise exception 'invalid_action';end if;
 if (select auth.uid()) is null then raise exception 'sign_in_required';end if;
 perform 1 from public.properties where id=p_property and owner_user_id=(select auth.uid()) for update;
 if not found then raise exception 'property_not_owned';end if;
 select * into b from public.direct_bookings where property_id=p_property and id=p_booking for update;
 if not found then raise exception 'booking_not_found';end if;
 if (p_action='checkin' and b.stay_state='checked_in') or (p_action='checkout' and b.stay_state='completed') then
  return jsonb_build_object('id',b.id,'stay_state',b.stay_state);
 end if;
 if b.external_id is not null and b.external_snapshot->>'status'='completed' then raise exception 'stay_changed';end if;
 if b.status<>'confirmed' or b.refund_result is not null then raise exception 'stay_changed';end if;
 select * into r from public.rooms where property_id=p_property and id=b.room_id for update;
 if not found or b.room_id is null then raise exception 'not_ready_for_checkin';end if;
 if p_action='checkin' then
  if b.stay_state<>'pending' or not r.active or b.arrival>today or b.departure<=today then raise exception 'not_ready_for_checkin';end if;
  if exists(select 1 from public.direct_bookings where property_id=p_property and room_id=b.room_id and stay_state='checked_in') then raise exception 'room_occupied';end if;
  update public.direct_bookings set stay_state='checked_in',checked_in_at=clock_timestamp() where id=b.id;
 else
  if b.stay_state<>'checked_in' then raise exception 'not_checked_in';end if;
  update public.direct_bookings set stay_state='completed',checked_out_at=clock_timestamp() where id=b.id;
 end if;
 return jsonb_build_object('id',b.id,'stay_state',case when p_action='checkin' then 'checked_in' else 'completed' end);
end $$;

create or replace function private.record_operation_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema<>'public' or tg_table_name not in ('rooms','direct_bookings') then raise exception 'invalid_activity_source';end if;
 if tg_table_name='rooms' then
  if tg_op='INSERT' then
   insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,'room_added',new.id,new.number);
  else
   if new.active is distinct from old.active then insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,case when new.active then 'room_enabled' else 'room_disabled' end,new.id,new.number);end if;
  end if;
 else
  if tg_op='INSERT' then
   insert into public.operation_activity(property_id,kind,resource_id,room_number,automatic) values(new.property_id,'booking_confirmed',new.id,new.room_number,true);
  else
   if new.status='cancelled' and old.status<>'cancelled' then insert into public.operation_activity(property_id,kind,resource_id,room_number,automatic) values(new.property_id,'booking_cancelled',new.id,new.room_number,coalesce(new.refund_result='auto_cancelled',false));end if;
   if new.stay_state is distinct from old.stay_state and new.stay_state in ('checked_in','completed') then insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,case when new.stay_state='checked_in' then 'checked_in' else 'checked_out' end,new.id,new.room_number);end if;
   if new.refund_result is distinct from old.refund_result and new.refund_result in ('review_pending','review_approved','review_rejected') then insert into public.operation_activity(property_id,kind,resource_id,room_number,completed) values(new.property_id,case new.refund_result when 'review_pending' then 'cancellation_requested' when 'review_approved' then 'cancellation_approved' else 'cancellation_rejected' end,new.id,new.room_number,new.refund_result<>'review_pending');end if;
  end if;
 end if;
 return new;
end $$;

drop trigger room_operation_activity on public.rooms;

create trigger room_operation_activity after insert or update of active on public.rooms
 for each row execute function private.record_operation_activity();

alter table public.rooms drop column housekeeping;

delete from public.operation_activity where kind in ('room_cleaned','room_dirty');

alter table public.operation_activity drop constraint operation_activity_kind_check;

alter table public.operation_activity add constraint operation_activity_kind_check check (kind in ('room_added','room_enabled','room_disabled','booking_confirmed','booking_cancelled','checked_in','checked_out','cancellation_requested','cancellation_approved','cancellation_rejected'));

update public.property_inventory as legacy
set inventory = jsonb_set(legacy.inventory, '{rooms}', (
 select jsonb_agg(room - 'housekeeping' order by ordinal)
 from jsonb_array_elements(legacy.inventory->'rooms') with ordinality as r(room, ordinal)
))
where exists (select 1 from jsonb_array_elements(legacy.inventory->'rooms') as r(room) where room ? 'housekeeping');

commit;
