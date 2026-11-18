-- Retire unused customer-service objects without deleting historical records.
-- All changes are transactional. Unexpected live dependencies abort the migration.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  legacy_names text[] := array['conversations','messages','reply_drafts',
    'reply_automation_settings','reply_automation_events','property_inventory','property_memberships'];
  legacy_ids oid[];
  item record;
  table_name text;
  column_names text;
  privilege_name text;
  retired_functions text[] := array['direct_booking_api','guest_message_api',
    'guest_reply_automation','guest_property_profile','control_reply_automation',
    'reply_conversation','save_reply_draft','get_conversations',
    'booking_photo_allowed','preserve_inventory_room_ids'];
begin
  if exists(select 1 from pg_namespace where nspname='retired_legacy') then
    raise exception 'retired_legacy already exists: inspect before applying cleanup';
  end if;
  if to_regprocedure('public.get_room_inventory(uuid)') is null
    or to_regprocedure('public.save_room_inventory(uuid,jsonb,uuid)') is null
    or not exists(select 1 from information_schema.columns c where c.table_schema='public'
      and c.table_name='properties' and c.column_name='owner_user_id') then
    raise exception 'Current owner/inventory migration is required before cleanup';
  end if;

  foreach table_name in array legacy_names loop
    if to_regclass(format('public.%I',table_name)) is null then
      raise exception 'Expected legacy table % is missing; inspect migration history',table_name;
    end if;
    execute format('lock table public.%I in access exclusive mode',table_name);
  end loop;
  select array_agg(c.oid) into legacy_ids from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=any(legacy_names);

  if exists(select 1 from pg_constraint where contype='f' and confrelid=any(legacy_ids)
    and not (conrelid=any(legacy_ids))) then
    raise exception 'An active table references legacy data; cleanup aborted';
  end if;
  if exists(select 1 from pg_depend d join pg_rewrite r on d.classid='pg_rewrite'::regclass and r.oid=d.objid
    where d.refclassid='pg_class'::regclass and d.refobjid=any(legacy_ids)
      and not (r.ev_class=any(legacy_ids))) then
    raise exception 'An active view references legacy data; cleanup aborted';
  end if;
  if exists(select 1 from pg_depend d join pg_policy p on d.classid='pg_policy'::regclass and p.oid=d.objid
    where d.refclassid='pg_class'::regclass and d.refobjid=any(legacy_ids)
      and not (p.polrelid=any(legacy_ids))) then
    raise exception 'An active policy references legacy data; cleanup aborted';
  end if;
  for item in select n.nspname,p.proname,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prokind='f' and not (p.proname=any(retired_functions)) loop
    foreach table_name in array legacy_names loop
      if item.prosrc ~* ('\mpublic\s*\.\s*"?'||table_name||'\M') then
        raise exception 'Active function %.% references legacy table %',item.nspname,item.proname,table_name;
      end if;
    end loop;
  end loop;
  if exists(select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid
    join pg_namespace n on n.oid=p.pronamespace where not t.tgisinternal
      and n.nspname in ('public','private') and p.proname=any(retired_functions)
      and not (t.tgrelid=any(legacy_ids))) then
    raise exception 'An active trigger uses a retired function; cleanup aborted';
  end if;

  create schema retired_legacy;
  revoke all on schema retired_legacy from public,anon,authenticated,service_role;
  comment on schema retired_legacy is 'Archived StayCraft guest messaging and pre-normalization records. No application access. Records are retained for recovery.';

  -- This public guest photo policy survived the earlier HTTP/RPC retirement.
  -- The separate owner-only photo policies remain in place.
  drop policy if exists "guest catalog room photos" on storage.objects;
  -- Qualify the outer object name: an unqualified name inside EXISTS resolves
  -- to properties.name, which the old public policy had masked on reads.
  alter policy "account reads own room photos" on storage.objects using (
    bucket_id='room-photos' and exists(select 1 from public.properties p
      where p.id::text=(storage.foldername(storage.objects.name))[1]
        and p.owner_user_id=(select auth.uid()))
  );
  alter policy "account uploads own room photos" on storage.objects with check (
    bucket_id='room-photos' and exists(select 1 from public.properties p
      where p.id::text=(storage.foldername(storage.objects.name))[1]
        and p.owner_user_id=(select auth.uid()))
  );

  for item in select p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.prokind='f' and p.proname=any(retired_functions)
    order by n.nspname,p.proname loop
    execute format('revoke all on function %I.%I(%s) from public,anon,authenticated,service_role',item.nspname,item.proname,item.args);
    execute format('alter function %I.%I(%s) rename to %I',item.nspname,item.proname,item.args,item.nspname||'_'||item.proname);
    execute format('alter function %I.%I(%s) set schema retired_legacy',item.nspname,item.nspname||'_'||item.proname,item.args);
  end loop;
  foreach table_name in array legacy_names loop
    execute format('revoke all on table public.%I from public,anon,authenticated,service_role',table_name);
    select string_agg(quote_ident(a.attname),',') into column_names from pg_attribute a
      where a.attrelid=to_regclass(format('public.%I',table_name)) and a.attnum>0 and not a.attisdropped;
    foreach privilege_name in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
      execute format('revoke %s (%s) on table public.%I from public,anon,authenticated,service_role',privilege_name,column_names,table_name);
    end loop;
    execute format('alter table public.%I enable row level security',table_name);
    execute format('alter table public.%I set schema retired_legacy',table_name);
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
