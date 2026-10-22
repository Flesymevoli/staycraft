begin;
alter table public.properties add column inventory_revision uuid;
update public.properties p set inventory_revision=i.revision from public.property_inventory i where i.property_id=p.id;
create table public.room_types(
 property_id uuid not null references public.properties(id),id uuid not null,
 name text not null check(length(trim(name)) between 1 and 60),beds text not null check(length(trim(beds)) between 1 and 80),
 capacity smallint not null check(capacity between 1 and 12),price numeric(10,2) not null check(price>0 and price<=99999),
 photo_path text not null default '',created_at timestamptz not null default now(),primary key(property_id,id),
 check(photo_path='' or (photo_path ~* '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$' and split_part(photo_path,'/',1)=property_id::text))
);
create table public.rooms(
 property_id uuid not null references public.properties(id),id uuid not null,type_id uuid not null,
 number text not null check(length(trim(number)) between 1 and 24),floor text not null check(length(trim(floor)) between 1 and 30),
 housekeeping text not null check(housekeeping in ('clean','dirty')),active boolean not null default true,
 created_at timestamptz not null default now(),primary key(property_id,id),
 foreign key(property_id,type_id) references public.room_types(property_id,id)
);
create unique index rooms_unique_number on public.rooms(property_id,lower(normalize(trim(number),NFKC)));
create index rooms_type on public.rooms(property_id,type_id);
insert into public.room_types(property_id,id,name,beds,capacity,price,photo_path)
 select i.property_id,(t->>'id')::uuid,t->>'name',t->>'beds',(t->>'capacity')::smallint,(t->>'price')::numeric,t->>'photo' from public.property_inventory i,jsonb_array_elements(i.inventory->'types') t;
insert into public.rooms(property_id,id,type_id,number,floor,housekeeping,active)
 select i.property_id,(r->>'id')::uuid,(r->>'typeId')::uuid,r->>'number',r->>'floor',r->>'housekeeping',(r->>'active')::boolean from public.property_inventory i,jsonb_array_elements(i.inventory->'rooms') r;
alter table public.direct_bookings add constraint booking_room_reference foreign key(property_id,room_id) references public.rooms(property_id,id);
alter table public.direct_bookings add constraint booking_type_reference foreign key(property_id,type_id) references public.room_types(property_id,id);
create index direct_bookings_type on public.direct_bookings(property_id,type_id);
alter table public.room_types enable row level security;
alter table public.rooms enable row level security;
revoke all on public.room_types,public.rooms from public,anon,authenticated;
grant select on public.room_types,public.rooms to authenticated;
create policy "account reads room types" on public.room_types for select to authenticated using(exists(select 1 from public.properties p where p.id=room_types.property_id and p.owner_user_id=(select auth.uid())));
create policy "account reads rooms" on public.rooms for select to authenticated using(exists(select 1 from public.properties p where p.id=rooms.property_id and p.owner_user_id=(select auth.uid())));
-- Read-only compatibility projection, never a second writable source.
create function private.inventory_document(p_property uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('types',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'beds',t.beds,'capacity',t.capacity,'price',t.price,'photo',t.photo_path) order by t.created_at,t.id) from public.room_types t where t.property_id=p.id),'[]'),
 'rooms',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'number',r.number,'floor',r.floor,'typeId',r.type_id,'housekeeping',r.housekeeping,'active',r.active) order by r.created_at,r.id) from public.rooms r where r.property_id=p.id),'[]')) from public.properties p where p.id=p_property
$$;
revoke all on function private.inventory_document(uuid) from public,anon;
grant execute on function private.inventory_document(uuid) to authenticated;
create function public.get_room_inventory(p_property uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('inventory',private.inventory_document(p.id),'revision',p.inventory_revision) from public.properties p where p.id=p_property
$$;
revoke all on function public.get_room_inventory(uuid) from public,anon;
grant execute on function public.get_room_inventory(uuid) to authenticated;
create function private.save_room_inventory(p_property uuid,p_inventory jsonb,p_revision uuid) returns jsonb
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
  insert into public.rooms(property_id,id,type_id,number,floor,housekeeping,active) values(p_property,(item->>'id')::uuid,(item->>'typeId')::uuid,normalize(trim(item->>'number'),NFKC),trim(item->>'floor'),item->>'housekeeping',(item->>'active')::boolean)
   on conflict(property_id,id) do update set type_id=excluded.type_id,number=excluded.number,floor=excluded.floor,housekeeping=excluded.housekeeping,active=excluded.active;
 end loop;
 update public.properties set inventory_revision=next_revision where id=p_property;
 return jsonb_build_object('inventory',private.inventory_document(p_property),'revision',next_revision);
end $$;
revoke all on function private.save_room_inventory(uuid,jsonb,uuid) from public,anon;
grant execute on function private.save_room_inventory(uuid,jsonb,uuid) to authenticated;
create function public.save_room_inventory(p_property uuid,p_inventory jsonb,p_revision uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.save_room_inventory(p_property,p_inventory,p_revision)$$;
revoke all on function public.save_room_inventory(uuid,jsonb,uuid) from public,anon;
grant execute on function public.save_room_inventory(uuid,jsonb,uuid) to authenticated;
revoke insert,update on public.property_inventory from authenticated;
comment on table public.property_inventory is 'Read-only legacy snapshot retained at normalization; room_types and rooms are authoritative.';
create or replace function private.booking_photo_allowed(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.room_types t where t.photo_path=object_name and exists(select 1 from public.rooms r where r.property_id=t.property_id and r.type_id=t.id and r.active))
$$;
create or replace function private.direct_booking_api(p_property uuid,p_action text,p_token text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare inv jsonb; typ jsonb; chosen jsonb; result jsonb; row public.direct_bookings;
 a date; d date; rate numeric; hashed text; request uuid; orderid uuid; current_day date:=(now() at time zone 'Asia/Shanghai')::date;
begin
 if p_action not in ('catalog','book','orders','cancel') then raise exception 'invalid_action'; end if;
 if p_action='catalog' then
  select private.inventory_document(p_property) into inv;
  if inv is null then raise exception 'property_unavailable'; end if;
  a:=nullif(p_data->>'arrival','')::date; d:=nullif(p_data->>'departure','')::date;
  if a is not null and (d is null or a<current_day or d<=a or d>a+30) then raise exception 'invalid_dates'; end if;
  select coalesce(jsonb_agg(t || jsonb_build_object('available', (select count(*) from jsonb_array_elements(inv->'rooms') r where (r->>'active')::boolean and r->>'typeId'=t->>'id' and not exists(select 1 from public.direct_bookings b where b.property_id=p_property and b.room_id=(r->>'id')::uuid and b.status='confirmed' and a is not null and b.arrival<d and b.departure>a)))), '[]') into result from jsonb_array_elements(inv->'types') t where exists(select 1 from jsonb_array_elements(inv->'rooms') r where (r->>'active')::boolean and r->>'typeId'=t->>'id');
  return jsonb_build_object('name',coalesce((select profile->>'name' from public.property_details where property_id=p_property),(select name from public.properties where id=p_property)),'types',result);
 end if;
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'guest_session_required'; end if;
 hashed:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if p_action='orders' then
  select coalesce(jsonb_agg(to_jsonb(b)-array['guest_hash','phone','request_id'] order by b.created_at desc),'[]') into result from (select * from public.direct_bookings where property_id=p_property and guest_hash=hashed order by created_at desc limit 50) b;
  return jsonb_build_object('orders',result);
 end if;
 -- Serialize normalized inventory edits and booking assignment, keeping the critical section short.
 perform 1 from public.properties where id=p_property for update;
 if not found then raise exception 'property_unavailable';end if;
 select private.inventory_document(p_property) into inv;
 if inv is null then raise exception 'property_unavailable'; end if;
 if p_action='cancel' then
  orderid:=(p_data->>'id')::uuid;
  select * into row from public.direct_bookings where property_id=p_property and id=orderid and guest_hash=hashed for update;
  if row.id is null then raise exception 'order_not_found'; end if;
  if row.refund_result is null and row.status='confirmed' then
   update public.direct_bookings set refund_result=case when now() < (row.arrival+time '18:00') at time zone 'Asia/Shanghai' then 'auto_cancelled' else 'review_pending' end,
    status=case when now() < (row.arrival+time '18:00') at time zone 'Asia/Shanghai' then 'cancelled' else status end,refund_requested_at=now()
   where id=row.id returning * into row;
  end if;
  return to_jsonb(row)-array['guest_hash','phone','request_id'];
 end if;
 a:=(p_data->>'arrival')::date; d:=(p_data->>'departure')::date; request:=(p_data->>'requestId')::uuid;
 if a is null or d is null or a<current_day or d<=a or d>a+30 or request is null then raise exception 'invalid_dates'; end if;
 if length(trim(coalesce(p_data->>'name',''))) not between 1 and 40 or coalesce(p_data->>'phone','') !~ '^[0-9+ ()-]{7,20}$' or coalesce(p_data->>'expectedArrival','') not in ('14:00 前','18:00 前','22:00 前','次日 02:00 前') then raise exception 'invalid_guest'; end if;
 select * into row from public.direct_bookings where property_id=p_property and guest_hash=hashed and request_id=request;
 if row.id is not null then
  if row.arrival<>a or row.departure<>d or row.type_id::text<>p_data->>'typeId' or row.guest_name<>trim(p_data->>'name') or row.phone<>p_data->>'phone' or row.expected_arrival<>p_data->>'expectedArrival' then raise exception 'request_changed'; end if;
  return to_jsonb(row)-array['guest_hash','phone','request_id'];
 end if;
 if (select count(*) from public.direct_bookings where property_id=p_property and guest_hash=hashed and status='confirmed' and departure>=current_day)>=20 then raise exception 'booking_limit'; end if;
 select t into typ from jsonb_array_elements(inv->'types') t where t->>'id'=p_data->>'typeId';
 if typ is null then raise exception 'type_unavailable'; end if;
 rate:=(typ->>'price')::numeric;
 if rate is distinct from (p_data->>'price')::numeric then raise exception 'price_changed'; end if;
 select r into chosen from jsonb_array_elements(inv->'rooms') r where (r->>'active')::boolean and r->>'typeId'=typ->>'id' and not exists(select 1 from public.direct_bookings b where b.property_id=p_property and b.room_id=(r->>'id')::uuid and b.status='confirmed' and b.arrival<d and b.departure>a) order by r->>'number' limit 1;
 if chosen is null then raise exception 'sold_out'; end if;
 insert into public.direct_bookings(property_id,guest_hash,request_id,room_id,type_id,room_number,type_name,arrival,departure,guest_name,phone,expected_arrival,nightly_rate,total)
 values(p_property,hashed,request,(chosen->>'id')::uuid,(typ->>'id')::uuid,chosen->>'number',typ->>'name',a,d,trim(p_data->>'name'),p_data->>'phone',p_data->>'expectedArrival',rate,rate*(d-a)) returning * into row;
 return to_jsonb(row)-array['guest_hash','phone','request_id'];
end $$;

commit;
