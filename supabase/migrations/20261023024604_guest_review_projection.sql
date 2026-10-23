begin;
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
  select coalesce(jsonb_agg(to_jsonb(b)-array['guest_hash','phone','request_id','cancellation_reviewed_by'] order by b.created_at desc),'[]') into result from (select * from public.direct_bookings where property_id=p_property and guest_hash=hashed order by created_at desc limit 50) b;
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
  return to_jsonb(row)-array['guest_hash','phone','request_id','cancellation_reviewed_by'];
 end if;
 a:=(p_data->>'arrival')::date; d:=(p_data->>'departure')::date; request:=(p_data->>'requestId')::uuid;
 if a is null or d is null or a<current_day or d<=a or d>a+30 or request is null then raise exception 'invalid_dates'; end if;
 if length(trim(coalesce(p_data->>'name',''))) not between 1 and 40 or coalesce(p_data->>'phone','') !~ '^[0-9+ ()-]{7,20}$' or coalesce(p_data->>'expectedArrival','') not in ('14:00 前','18:00 前','22:00 前','次日 02:00 前') then raise exception 'invalid_guest'; end if;
 select * into row from public.direct_bookings where property_id=p_property and guest_hash=hashed and request_id=request;
 if row.id is not null then
  if row.arrival<>a or row.departure<>d or row.type_id::text<>p_data->>'typeId' or row.guest_name<>trim(p_data->>'name') or row.phone<>p_data->>'phone' or row.expected_arrival<>p_data->>'expectedArrival' then raise exception 'request_changed'; end if;
  return to_jsonb(row)-array['guest_hash','phone','request_id','cancellation_reviewed_by'];
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
 return to_jsonb(row)-array['guest_hash','phone','request_id','cancellation_reviewed_by'];
end $$;
commit;

