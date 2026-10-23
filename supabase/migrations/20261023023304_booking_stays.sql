begin;
alter table public.direct_bookings
 add column stay_state text not null default 'pending' check(stay_state in ('pending','checked_in','completed')),
 add column checked_in_at timestamptz,
 add column checked_out_at timestamptz,
 add constraint valid_stay_timestamps check(
  (stay_state='pending' and checked_in_at is null and checked_out_at is null) or
  (stay_state='checked_in' and checked_in_at is not null and checked_out_at is null) or
  (stay_state='completed' and checked_in_at is not null and checked_out_at is not null and checked_out_at>=checked_in_at));
create unique index one_current_stay_per_room on public.direct_bookings(property_id,room_id) where stay_state='checked_in';
create function public.get_booking_stays(p_property uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.properties where id=p_property and owner_user_id=(select auth.uid())) then raise exception 'property_not_owned';end if;
 return jsonb_build_object('bookings',coalesce((select jsonb_agg(to_jsonb(b)) from (
  select id,room_id,room_number,arrival,departure,status,refund_result,stay_state,checked_in_at,checked_out_at from public.direct_bookings
  where property_id=p_property order by (stay_state='checked_in') desc,arrival desc,id limit 500
 ) b),'[]'::jsonb));
end $$;
revoke all on function public.get_booking_stays(uuid) from public,anon;
grant execute on function public.get_booking_stays(uuid) to authenticated;
create function private.change_booking_stay(p_property uuid,p_booking uuid,p_action text) returns jsonb
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
 if b.status<>'confirmed' or b.refund_result is not null then raise exception 'stay_changed';end if;
 select * into r from public.rooms where property_id=p_property and id=b.room_id for update;
 if p_action='checkin' then
  if b.stay_state<>'pending' or not r.active or r.housekeeping<>'clean' or b.arrival>today or b.departure<=today then raise exception 'not_ready_for_checkin';end if;
  if exists(select 1 from public.direct_bookings where property_id=p_property and room_id=b.room_id and stay_state='checked_in') then raise exception 'room_occupied';end if;
  update public.direct_bookings set stay_state='checked_in',checked_in_at=clock_timestamp() where id=b.id;
 else
  if b.stay_state<>'checked_in' then raise exception 'not_checked_in';end if;
  update public.direct_bookings set stay_state='completed',checked_out_at=clock_timestamp() where id=b.id;
  update public.rooms set housekeeping='dirty' where property_id=p_property and id=b.room_id;
  update public.properties set inventory_revision=gen_random_uuid() where id=p_property;
 end if;
 return jsonb_build_object('id',b.id,'stay_state',case when p_action='checkin' then 'checked_in' else 'completed' end);
end $$;
revoke all on function private.change_booking_stay(uuid,uuid,text) from public,anon;
grant execute on function private.change_booking_stay(uuid,uuid,text) to authenticated;
create function public.change_booking_stay(p_property uuid,p_booking uuid,p_action text) returns jsonb language sql security invoker set search_path='' as $$select private.change_booking_stay(p_property,p_booking,p_action)$$;
revoke all on function public.change_booking_stay(uuid,uuid,text) from public,anon;
grant execute on function public.change_booking_stay(uuid,uuid,text) to authenticated;
-- Guard existing guest cancellation and privileged inventory writes after occupancy.
create function private.guard_active_booking() returns trigger language plpgsql set search_path='' as $$
begin
 if old.stay_state<>'pending' and (new.status is distinct from old.status or new.refund_result is distinct from old.refund_result or new.room_id is distinct from old.room_id or new.arrival is distinct from old.arrival or new.departure is distinct from old.departure) then raise exception 'stay_changed';end if;
 return new;
end $$;
revoke all on function private.guard_active_booking() from public,anon,authenticated;
create trigger protect_active_booking before update on public.direct_bookings for each row execute function private.guard_active_booking();
create function private.guard_occupied_room() returns trigger language plpgsql set search_path='' as $$
begin
 if not new.active and exists(select 1 from public.direct_bookings where property_id=old.property_id and room_id=old.id and stay_state='checked_in') then raise exception 'room_occupied';end if;
 return new;
end $$;
revoke all on function private.guard_occupied_room() from public,anon,authenticated;
create trigger protect_occupied_room before update on public.rooms for each row execute function private.guard_occupied_room();

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
  select coalesce(jsonb_agg(t || jsonb_build_object('available', (select count(*) from jsonb_array_elements(inv->'rooms') r where (r->>'active')::boolean and r->>'typeId'=t->>'id' and not exists(select 1 from public.direct_bookings b where b.property_id=p_property and b.room_id=(r->>'id')::uuid and b.status='confirmed' and b.stay_state<>'completed' and a is not null and (b.stay_state='checked_in' or (b.arrival<d and b.departure>a)))))), '[]') into result from jsonb_array_elements(inv->'types') t where exists(select 1 from jsonb_array_elements(inv->'rooms') r where (r->>'active')::boolean and r->>'typeId'=t->>'id');
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
  if row.stay_state<>'pending' then raise exception 'stay_changed';end if;
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
 select r into chosen from jsonb_array_elements(inv->'rooms') r where (r->>'active')::boolean and r->>'typeId'=typ->>'id' and not exists(select 1 from public.direct_bookings b where b.property_id=p_property and b.room_id=(r->>'id')::uuid and b.status='confirmed' and b.stay_state<>'completed' and (b.stay_state='checked_in' or (b.arrival<d and b.departure>a))) order by r->>'number' limit 1;
 if chosen is null then raise exception 'sold_out'; end if;
 insert into public.direct_bookings(property_id,guest_hash,request_id,room_id,type_id,room_number,type_name,arrival,departure,guest_name,phone,expected_arrival,nightly_rate,total)
 values(p_property,hashed,request,(chosen->>'id')::uuid,(typ->>'id')::uuid,chosen->>'number',typ->>'name',a,d,trim(p_data->>'name'),p_data->>'phone',p_data->>'expectedArrival',rate,rate*(d-a)) returning * into row;
 return to_jsonb(row)-array['guest_hash','phone','request_id'];
end $$;
create or replace function public.get_booking_metrics(p_property uuid,p_days integer default 7) returns jsonb
language plpgsql stable security invoker set search_path='' set statement_timeout='5s' as $$
declare first_day date:=(now() at time zone 'Asia/Shanghai')::date; capacity integer; result jsonb;
begin
 if p_days is null or p_days not in (7,28) then raise exception 'invalid_period';end if;
 if not exists(select 1 from public.properties where id=p_property and owner_user_id=(select auth.uid())) then raise exception 'property_not_owned';end if;
 select count(*) into capacity from public.rooms where property_id=p_property and active;
 with days as(select first_day+i as day from generate_series(0,p_days-1) i),
 room_nights as(
  select distinct d.day,b.room_id,r.active from days d join public.direct_bookings b on b.property_id=p_property and b.status='confirmed' and b.stay_state<>'completed' and b.arrival<=d.day and b.departure>d.day
  join public.rooms r on r.property_id=b.property_id and r.id=b.room_id
 ),
 daily as(
  select d.day,count(n.room_id) filter(where n.active) as booked,count(n.room_id) filter(where not n.active) as inactive_booked
  from days d left join room_nights n on n.day=d.day group by d.day
 )
 select jsonb_build_object(
  'source','direct_bookings','as_of',first_day,'period_days',p_days,'period_start',first_day,'period_end',first_day+p_days-1,
  'active_rooms',capacity,'capacity_room_nights',capacity*p_days,'booked_room_nights',sum(booked),'inactive_booked_room_nights',sum(inactive_booked),
  'available_room_nights',capacity*p_days-sum(booked),'booked_pct',round(sum(booked)*100/nullif(capacity*p_days,0),1),
  'daily',jsonb_agg(jsonb_build_object('date',day,'booked',booked,'capacity',capacity,'available',capacity-booked,'booked_pct',round(booked*100.0/nullif(capacity,0),1)) order by day),
  'rate_min',(select min(t.price) from public.room_types t where t.property_id=p_property and exists(select 1 from public.rooms r where r.property_id=t.property_id and r.type_id=t.id and r.active)),
  'rate_max',(select max(t.price) from public.room_types t where t.property_id=p_property and exists(select 1 from public.rooms r where r.property_id=t.property_id and r.type_id=t.id and r.active))
 ) into result from daily;
 return result;
end $$;
commit;
