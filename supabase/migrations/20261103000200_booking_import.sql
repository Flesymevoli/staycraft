begin;
alter table public.properties add column booking_import_revision uuid not null default gen_random_uuid();
alter table public.direct_bookings
 add column external_channel text,
 add column external_id text,
 add column external_snapshot jsonb,
 add column source_updated_at timestamptz,
 add column imported_at timestamptz,
 alter column guest_hash drop not null,
 alter column request_id drop not null,
 alter column room_id drop not null,
 alter column room_number drop not null,
 alter column guest_name drop not null,
 alter column phone drop not null,
 alter column expected_arrival drop not null;
alter table public.direct_bookings alter column nightly_rate drop not null;
alter table public.direct_bookings add constraint booking_origin_required check (
 (external_id is null and external_channel is null and external_snapshot is null
  and guest_hash is not null and request_id is not null and room_id is not null
  and guest_name is not null and phone is not null and expected_arrival is not null and nightly_rate is not null)
 or (external_id is not null and external_channel is not null and external_snapshot is not null));
create unique index imported_booking_identity on public.direct_bookings(property_id,external_channel,external_id) where external_id is not null;

create table public.booking_import_batches(
 property_id uuid not null references public.properties(id),id uuid primary key default gen_random_uuid(),
 imported_at timestamptz not null default clock_timestamp(),counts jsonb not null,channels jsonb not null,
 first_arrival date not null,last_departure date not null
);
create index booking_import_recent on public.booking_import_batches(property_id,imported_at desc);
create table public.booking_import_tasks(
 property_id uuid not null references public.properties(id),id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.direct_bookings(id),kind text not null check(kind in ('arrival','departure','unassigned','changed')),
 scheduled_on date not null,generation text not null,completed_at timestamptz,withdrawn boolean not null default false,
 unique(property_id,booking_id,kind,generation)
);
create index booking_import_pending on public.booking_import_tasks(property_id,scheduled_on) where not withdrawn and completed_at is null;
alter table public.booking_import_batches enable row level security;
alter table public.booking_import_tasks enable row level security;
revoke all on public.booking_import_batches,public.booking_import_tasks from public,anon,authenticated;
grant select on public.booking_import_batches,public.booking_import_tasks to authenticated;
create policy own_import_batches on public.booking_import_batches for select to authenticated using(exists(select 1 from public.properties p where p.id=property_id and p.owner_user_id=(select auth.uid())));
create policy own_import_tasks on public.booking_import_tasks for select to authenticated using(exists(select 1 from public.properties p where p.id=property_id and p.owner_user_id=(select auth.uid())));

-- Room activity remains unchanged. Imported snapshots are not physical stays.
drop trigger booking_operation_activity on public.direct_bookings;
create function private.record_import_aware_booking_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.external_id is not null then return new;end if;
 if tg_op='INSERT' then
  insert into public.operation_activity(property_id,kind,resource_id,room_number,automatic) values(new.property_id,'booking_confirmed',new.id,new.room_number,true);
 else
  if new.status='cancelled' and old.status<>'cancelled' then insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,'booking_cancelled',new.id,new.room_number);end if;
  if new.stay_state is distinct from old.stay_state and new.stay_state in ('checked_in','completed') then insert into public.operation_activity(property_id,kind,resource_id,room_number) values(new.property_id,case when new.stay_state='checked_in' then 'checked_in' else 'checked_out' end,new.id,new.room_number);end if;
  if new.refund_result is distinct from old.refund_result and new.refund_result in ('review_pending','review_approved','review_rejected') then insert into public.operation_activity(property_id,kind,resource_id,room_number,completed) values(new.property_id,case new.refund_result when 'review_pending' then 'cancellation_requested' when 'review_approved' then 'cancellation_approved' else 'cancellation_rejected' end,new.id,new.room_number,new.refund_result<>'review_pending');end if;
 end if;
 return new;
end $$;
create trigger booking_operation_activity after insert or update of status,stay_state,refund_result on public.direct_bookings for each row execute function private.record_import_aware_booking_activity();
revoke all on function private.record_import_aware_booking_activity() from public,anon,authenticated;

create function public.process_booking_import(p_property uuid,p_rows jsonb,p_commit boolean default false,p_revision uuid default null,p_confirm_unversioned boolean default false) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='15s' as $$
declare rev uuid;x jsonb;b public.direct_bookings;t uuid;r uuid;num text;result jsonb:='[]';action text;newid uuid;stamp timestamptz;v_generation text;batch uuid;today date:=(now() at time zone 'Asia/Shanghai')::date;
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
   or x->>'roomType' is null or x->>'status' is null or x->>'currency' is null or x->>'totalCents' is null or x->>'arrival' is null or x->>'departure' is null
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
  if t is null or (select count(*) from public.room_types where property_id=p_property and name=x->>'roomType')<>1 then raise exception 'room_type_unmatched';end if;
  r:=null;num:=null;
  if nullif(x->>'roomNumber','') is not null then
   select id,number into r,num from public.rooms where property_id=p_property and type_id=t and number=x->>'roomNumber' and active;
   if r is null then raise exception 'room_unmatched';end if;
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
 if p_commit then
  insert into public.booking_import_batches(property_id,counts,channels,first_arrival,last_departure)
   select p_property,(select jsonb_object_agg(a,n) from (select e->>'action' a,count(*) n from jsonb_array_elements(result) e group by e->>'action') q),(select jsonb_agg(distinct e->>'channel') from jsonb_array_elements(p_rows) e),(select min((e->>'arrival')::date) from jsonb_array_elements(p_rows) e),(select max((e->>'departure')::date) from jsonb_array_elements(p_rows) e) returning id into batch;
  update public.properties set booking_import_revision=gen_random_uuid() where id=p_property returning booking_import_revision into rev;
 end if;
 return jsonb_build_object('revision',rev,'rows',result,'saved',p_commit,'batchId',batch);
end $$;
revoke all on function public.process_booking_import(uuid,jsonb,boolean,uuid,boolean) from public,anon;
grant execute on function public.process_booking_import(uuid,jsonb,boolean,uuid,boolean) to authenticated;

create function public.complete_import_task(p_property uuid,p_task uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.properties where id=p_property and owner_user_id=(select auth.uid())) then raise exception 'property_not_owned';end if;
 update public.booking_import_tasks set completed_at=coalesce(completed_at,clock_timestamp()) where property_id=p_property and id=p_task and not withdrawn;
 if not found then raise exception 'task_changed';end if;
end $$;
revoke all on function public.complete_import_task(uuid,uuid) from public,anon;
grant execute on function public.complete_import_task(uuid,uuid) to authenticated;
commit;
