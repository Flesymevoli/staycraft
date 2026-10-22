begin;
create schema if not exists private;
create table public.direct_bookings (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id),
 guest_hash text not null check(length(guest_hash)=64), request_id uuid not null,
 room_id uuid not null, type_id uuid not null, room_number text not null, type_name text not null,
 arrival date not null, departure date not null check(departure>arrival and departure<=arrival+30),
 guest_name text not null check(length(trim(guest_name)) between 1 and 40),
 phone text not null check(phone ~ '^[0-9+ ()-]{7,20}$'), expected_arrival text not null,
 nightly_rate numeric(10,2) not null check(nightly_rate>0), total numeric(12,2) not null check(total>0),
 status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
 refund_result text check(refund_result in ('auto_cancelled','review_pending')),
 refund_requested_at timestamptz, created_at timestamptz not null default now(),
 unique(property_id,guest_hash,request_id)
);
create index direct_bookings_room_dates on public.direct_bookings(property_id,room_id,arrival,departure) where status='confirmed';
create index direct_bookings_guest on public.direct_bookings(property_id,guest_hash,created_at desc);
alter table public.direct_bookings enable row level security;
revoke all on public.direct_bookings from public,anon,authenticated;
grant select on public.direct_bookings to authenticated;
create policy "members read direct bookings" on public.direct_bookings for select to authenticated using(exists(select 1 from public.property_memberships m where m.property_id=direct_bookings.property_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
-- A narrow guest capability endpoint. Secrets are hashed and never returned to callers.
-- Definer is confined to the unexposed private schema; callers have no direct table access.
create function private.direct_booking_api(p_property uuid,p_action text,p_token text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare inv jsonb; typ jsonb; chosen jsonb; result jsonb; row public.direct_bookings;
 a date; d date; rate numeric; hashed text; request uuid; orderid uuid; current_day date:=(now() at time zone 'Asia/Shanghai')::date;
begin
 if p_action not in ('catalog','book','orders','cancel') then raise exception 'invalid_action'; end if;
 if p_action='catalog' then
  select inventory into inv from public.property_inventory where property_id=p_property;
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
 -- Serialize inventory edits and booking assignment, keeping the critical section short.
 select inventory into inv from public.property_inventory where property_id=p_property for update;
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
revoke all on function private.direct_booking_api(uuid,text,text,jsonb) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.direct_booking_api(uuid,text,text,jsonb) to anon,authenticated;
create function public.direct_booking_api(p_property uuid,p_action text,p_token text default null,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$ select private.direct_booking_api(p_property,p_action,p_token,p_data) $$;
revoke all on function public.direct_booking_api(uuid,text,text,jsonb) from public;
grant execute on function public.direct_booking_api(uuid,text,text,jsonb) to anon,authenticated;
create function private.booking_photo_allowed(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.property_inventory i, jsonb_array_elements(i.inventory->'types') t where t->>'photo'=object_name and exists(select 1 from jsonb_array_elements(i.inventory->'rooms') r where r->>'typeId'=t->>'id' and (r->>'active')::boolean))
$$;
revoke all on function private.booking_photo_allowed(text) from public;
grant execute on function private.booking_photo_allowed(text) to anon,authenticated;
create policy "guest catalog room photos" on storage.objects for select to anon,authenticated using(bucket_id='room-photos' and private.booking_photo_allowed(name));
commit;
