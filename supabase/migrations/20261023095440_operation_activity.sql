begin;
create table public.operation_activity(
 property_id uuid not null references public.properties(id),id uuid not null default gen_random_uuid(),
 kind text not null check(kind in ('room_added','room_enabled','room_disabled','room_cleaned','room_dirty','booking_confirmed','booking_cancelled','checked_in','checked_out','cancellation_requested','cancellation_approved','cancellation_rejected')),
 resource_id uuid not null,room_number text not null,automatic boolean not null default false,completed boolean not null default true,created_at timestamptz not null default clock_timestamp(),
 primary key(property_id,id)
);
create index operation_activity_recent on public.operation_activity(property_id,created_at desc,id);
alter table public.operation_activity enable row level security;
revoke all on public.operation_activity from public,anon,authenticated;
grant select on public.operation_activity to authenticated;
create policy "owner reads operation activity" on public.operation_activity for select to authenticated using(exists(select 1 from public.properties p where p.id=operation_activity.property_id and p.owner_user_id=(select auth.uid())));
-- Trigger-only insert capability: no role may manufacture completed operations.
create function private.record_operation_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema<>'public' or tg_table_name not in ('rooms','direct_bookings') then raise exception 'invalid_activity_source';end if;
 if tg_table_name='rooms' then
  if tg_op='INSERT' then
   insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,'room_added',new.id,new.number);
  else
   if new.housekeeping is distinct from old.housekeeping then insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,case when new.housekeeping='clean' then 'room_cleaned' else 'room_dirty' end,new.id,new.number);end if;
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
revoke all on function private.record_operation_activity() from public,anon,authenticated;
create trigger room_operation_activity after insert or update of housekeeping,active on public.rooms for each row execute function private.record_operation_activity();
create trigger booking_operation_activity after insert or update of status,stay_state,refund_result on public.direct_bookings for each row execute function private.record_operation_activity();
commit;
