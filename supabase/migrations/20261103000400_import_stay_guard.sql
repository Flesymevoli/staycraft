begin;
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
create or replace function public.change_booking_stay(p_property uuid,p_booking uuid,p_action text) returns jsonb language sql security invoker set search_path='' as $$select private.change_booking_stay(p_property,p_booking,p_action)$$;
revoke all on function public.change_booking_stay(uuid,uuid,text) from public,anon;
grant execute on function public.change_booking_stay(uuid,uuid,text) to authenticated;

commit;
