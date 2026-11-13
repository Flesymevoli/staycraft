begin;
alter table public.properties add column last_booking_clear jsonb;
alter table public.booking_import_batches add column source_revision uuid;
create unique index booking_import_source_revision on public.booking_import_batches(property_id,source_revision) where source_revision is not null;
create function private.capture_import_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select booking_import_revision into new.source_revision from public.properties where id=new.property_id;
 return new;
end $$;
revoke all on function private.capture_import_revision() from public,anon,authenticated;
create trigger capture_import_revision before insert on public.booking_import_batches for each row execute function private.capture_import_revision();

create function public.booking_import_receipt(p_property uuid,p_revision uuid) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='20s' as $$
declare revision uuid; receipt jsonb;
begin
 select booking_import_revision into revision from public.properties where id=p_property and owner_user_id=(select auth.uid()) for update;
 if not found then raise exception 'property_not_owned';end if;
 select jsonb_build_object('id',id,'counts',counts,'importedAt',imported_at) into receipt from public.booking_import_batches where property_id=p_property and source_revision=p_revision;
 return jsonb_build_object('status',case when receipt is null then 'not_found' else 'saved' end,'batch',receipt,'revision',revision);
end $$;
revoke all on function public.booking_import_receipt(uuid,uuid) from public,anon;
grant execute on function public.booking_import_receipt(uuid,uuid) to authenticated;

-- Preview and deletion share the import lock and revision. A later import makes
-- an older confirmation invalid. Inventory and manually created stays survive.
create function public.clear_imported_booking_data(p_property uuid, p_commit boolean default false, p_revision uuid default null)
returns jsonb language plpgsql security definer set search_path = '' set statement_timeout = '15s' as $$
declare rev uuid; orders bigint; tasks bigint; batches bigint; last_clear jsonb;
begin
  if (select auth.uid()) is null then raise exception 'sign_in_required'; end if;
  if p_commit is null then raise exception 'invalid_clear_flags'; end if;
  select booking_import_revision into rev from public.properties
    where id = p_property and owner_user_id = (select auth.uid()) for update;
  if not found then raise exception 'property_not_owned'; end if;
  if p_commit and (p_revision is null or p_revision <> rev) then raise exception 'import_changed'; end if;
  select count(*) into orders from public.direct_bookings where property_id = p_property and external_id is not null;
  select count(*) into tasks from public.booking_import_tasks t where t.property_id = p_property
    and exists (select 1 from public.direct_bookings b where b.id = t.booking_id and b.property_id = p_property and b.external_id is not null);
  select count(*) into batches from public.booking_import_batches where property_id = p_property;
  if p_commit then
    delete from public.booking_import_tasks t where t.property_id = p_property
      and exists (select 1 from public.direct_bookings b where b.id = t.booking_id and b.property_id = p_property and b.external_id is not null);
    delete from public.operation_activity a where a.property_id = p_property
      and exists (select 1 from public.direct_bookings b where b.id = a.resource_id and b.property_id = p_property and b.external_id is not null);
    delete from public.direct_bookings where property_id = p_property and external_id is not null;
    delete from public.booking_import_batches where property_id = p_property;
    update public.properties set booking_import_revision = gen_random_uuid(),last_booking_clear=jsonb_build_object('sourceRevision',p_revision,'orders',orders,'tasks',tasks,'batches',batches,'completedAt',now()) where id = p_property returning booking_import_revision into rev;
  end if;
  select last_booking_clear into last_clear from public.properties where id=p_property;
  return jsonb_build_object('cleared',p_commit,'revision',rev,'orders',orders,'tasks',tasks,'batches',batches,'lastClear',last_clear);
end $$;
revoke all on function public.clear_imported_booking_data(uuid,boolean,uuid) from public, anon;
grant execute on function public.clear_imported_booking_data(uuid,boolean,uuid) to authenticated;
commit;
