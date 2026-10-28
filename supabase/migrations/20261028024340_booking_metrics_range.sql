begin;
create or replace function public.get_booking_metrics_range(p_property uuid,p_start date,p_end date) returns jsonb
language plpgsql stable security invoker set search_path='' set statement_timeout='5s' as $$
declare first_day date:=p_start; p_days integer:=p_end-p_start+1; capacity integer; result jsonb;
begin
 if p_start is null or p_end is null or p_days not between 1 and 366 or p_start < date '2000-01-01' or p_end > date '2100-12-31' then raise exception 'invalid_period';end if;
 if not exists(select 1 from public.properties where id=p_property and owner_user_id=(select auth.uid())) then raise exception 'property_not_owned';end if;
 select count(*) into capacity from public.rooms where property_id=p_property and active;
 with days as(select first_day+i as day from generate_series(0,p_days-1) i),
 order_nights as(
  select d.day,b.id,b.room_id,r.active,
   trunc(b.total*100/(b.departure-b.arrival))::bigint+case when d.day-b.arrival<mod((b.total*100)::bigint,b.departure-b.arrival) then 1 else 0 end as cents
  from days d join public.direct_bookings b on b.property_id=p_property and b.status='confirmed' and b.stay_state<>'completed' and b.arrival<=d.day and b.departure>d.day
  join public.rooms r on r.property_id=b.property_id and r.id=b.room_id
 ),
 room_nights as(select distinct day,room_id,active from order_nights),
 daily as(
  select d.day,count(n.room_id) filter(where n.active) as booked,count(n.room_id) filter(where not n.active) as inactive_booked,
   (select coalesce(sum(o.cents),0) from order_nights o where o.day=d.day and o.active) as amount_cents,
   (select count(*) from order_nights o where o.day=d.day and o.active) as order_room_nights
  from days d left join room_nights n on n.day=d.day group by d.day
 )
 select jsonb_build_object(
  'source','direct_bookings','as_of',(now() at time zone 'Asia/Shanghai')::date,'period_days',p_days,'period_start',first_day,'period_end',first_day+p_days-1,
  'active_rooms',capacity,'capacity_room_nights',capacity*p_days,'booked_room_nights',sum(booked),'inactive_booked_room_nights',sum(inactive_booked),
  'amount_cents',sum(amount_cents),'booked_order_room_nights',sum(order_room_nights),'average_booked_rate_cents',round(sum(amount_cents)/nullif(sum(order_room_nights),0)),
  'amount_per_capacity_night_cents',round(sum(amount_cents)/nullif(capacity*p_days,0)),'overlapping_order_room_nights',sum(order_room_nights)-sum(booked),
  'available_room_nights',capacity*p_days-sum(booked),'booked_pct',round(sum(booked)*100/nullif(capacity*p_days,0),1),
  'daily',jsonb_agg(jsonb_build_object('date',day,'booked',booked,'capacity',capacity,'amount_cents',amount_cents,'order_room_nights',order_room_nights,'available',capacity-booked,'booked_pct',round(booked*100.0/nullif(capacity,0),1)) order by day),
  'rate_min',(select min(t.price) from public.room_types t where t.property_id=p_property and exists(select 1 from public.rooms r where r.property_id=t.property_id and r.type_id=t.id and r.active)),
  'rate_max',(select max(t.price) from public.room_types t where t.property_id=p_property and exists(select 1 from public.rooms r where r.property_id=t.property_id and r.type_id=t.id and r.active))
 ) into result from daily;
 return result;
end $$;
revoke all on function public.get_booking_metrics_range(uuid,date,date) from public,anon;
grant execute on function public.get_booking_metrics_range(uuid,date,date) to authenticated;
commit;


