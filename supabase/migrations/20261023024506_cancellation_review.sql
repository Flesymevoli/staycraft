begin;
alter table public.direct_bookings drop constraint direct_bookings_refund_result_check;
alter table public.direct_bookings add constraint direct_bookings_refund_result_check check(refund_result in ('auto_cancelled','review_pending','review_approved','review_rejected'));
alter table public.direct_bookings add column cancellation_reviewed_at timestamptz,add column cancellation_reviewed_by uuid references auth.users(id) on delete set null;
create function private.review_booking_cancellation(p_property uuid,p_booking uuid,p_decision text) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare b public.direct_bookings;result text;
begin
 if p_decision is null or p_decision not in ('approve','reject') then raise exception 'invalid_decision';end if;
 if (select auth.uid()) is null then raise exception 'sign_in_required';end if;
 perform 1 from public.properties where id=p_property and owner_user_id=(select auth.uid()) for update;
 if not found then raise exception 'property_not_owned';end if;
 select * into b from public.direct_bookings where property_id=p_property and id=p_booking for update;
 if not found then raise exception 'booking_not_found';end if;
 result:=case when p_decision='approve' then 'review_approved' else 'review_rejected' end;
 if b.refund_result=result then return jsonb_build_object('id',b.id,'status',b.status,'refund_result',b.refund_result);end if;
 if b.status<>'confirmed' or b.stay_state<>'pending' or b.refund_result is distinct from 'review_pending' then raise exception 'review_changed';end if;
 update public.direct_bookings set status=case when p_decision='approve' then 'cancelled' else 'confirmed' end,
 refund_result=result,cancellation_reviewed_at=clock_timestamp(),cancellation_reviewed_by=(select auth.uid()) where id=b.id;
 return jsonb_build_object('id',b.id,'status',case when p_decision='approve' then 'cancelled' else 'confirmed' end,'refund_result',result);
end $$;
revoke all on function private.review_booking_cancellation(uuid,uuid,text) from public,anon;
grant execute on function private.review_booking_cancellation(uuid,uuid,text) to authenticated;
create function public.review_booking_cancellation(p_property uuid,p_booking uuid,p_decision text) returns jsonb language sql security invoker set search_path='' as $$select private.review_booking_cancellation(p_property,p_booking,p_decision)$$;
revoke all on function public.review_booking_cancellation(uuid,uuid,text) from public,anon;
grant execute on function public.review_booking_cancellation(uuid,uuid,text) to authenticated;
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
 if b.status<>'confirmed' or b.refund_result='review_pending' then raise exception 'stay_changed';end if;
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
commit;
