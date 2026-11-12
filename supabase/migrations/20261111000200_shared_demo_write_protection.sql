begin;

create function private.reject_shared_demo_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  protected_write boolean := true;
begin
  if tg_table_schema = 'storage' then
    protected_write := (tg_op <> 'INSERT' and old.bucket_id = 'room-photos')
      or (tg_op <> 'DELETE' and new.bucket_id = 'room-photos');
  elsif tg_table_name = 'decision_agent_runs' then
    case tg_op
      when 'INSERT' then protected_write := new.result -> 'actionPlan' is not null;
      when 'DELETE' then protected_write := old.result -> 'actionPlan' is not null;
      when 'UPDATE' then protected_write :=
        (old.result -> 'actionPlan') is distinct from (new.result -> 'actionPlan');
    end case;
  end if;

  if protected_write and auth.jwt() ->> 'role' = 'authenticated' and exists (
    select 1 from auth.users
    where id = auth.uid()
      and raw_app_meta_data @> '{"staycraft_demo_read_only":true}'::jsonb
  ) then
    raise exception 'demo_read_only' using errcode = '42501';
  end if;

  if tg_level = 'STATEMENT' then return null; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.reject_shared_demo_writes() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'properties', 'property_memberships', 'property_details', 'property_inventory',
    'room_types', 'rooms', 'direct_bookings', 'promotion_workspaces', 'conversations',
    'messages', 'reply_drafts', 'reply_automation_settings', 'reply_automation_events',
    'operation_activity', 'booking_import_batches', 'booking_import_tasks',
    'competitor_watches', 'market_quote_batches'
  ] loop
    execute format(
      'create trigger shared_demo_write_protection before insert or update or delete
       on public.%I for each statement execute function private.reject_shared_demo_writes()',
      table_name
    );
  end loop;
end;
$$;

create trigger shared_demo_write_protection
before insert or update or delete on public.decision_agent_runs
for each row execute function private.reject_shared_demo_writes();

create trigger shared_demo_write_protection
before insert or update or delete on storage.objects
for each row execute function private.reject_shared_demo_writes();

commit;
