create or replace function public.update_competitor_watchlist(
  p_property uuid, p_expected uuid[], p_retire uuid[], p_add jsonb
) returns setof public.competitor_watches
language plpgsql security invoker set search_path = ''
as $$
declare
  active_ids uuid[];
begin
  if not exists (
    select 1 from public.properties
    where id = p_property and owner_user_id = (select auth.uid())
  ) then
    raise exception 'watchlist_forbidden' using errcode = '42501';
  end if;
  if p_expected is null or p_retire is null or p_add is null
    or jsonb_typeof(p_add) <> 'array' then
    raise exception 'invalid_watchlist_change' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_property::text, 192341));
  select coalesce(array_agg(id order by id), '{}'::uuid[])
  into active_ids from public.competitor_watches where property_id = p_property and status = 'active';
  if active_ids <> array(select unnest(p_expected) order by 1) then
    raise exception 'watchlist_conflict' using errcode = '40001';
  end if;
  if not (p_retire <@ active_ids) or cardinality(p_retire) <> (select count(distinct id) from unnest(p_retire) ids(id))
    or cardinality(active_ids) - cardinality(p_retire) + jsonb_array_length(p_add) > 5 then
    raise exception 'invalid_watchlist_change' using errcode = '22023';
  end if;

  update public.competitor_watches set status = 'retired', retired_at = now()
  where property_id = p_property and id = any(p_retire) and status = 'active';
  insert into public.competitor_watches (property_id, hotel_id, hotel_name, room_class, source)
  select p_property, item.hotel_id, item.hotel_name, item.room_class, item.source
  from jsonb_to_recordset(p_add) as item(hotel_id text, hotel_name text, room_class text, source text);

  return query select w.* from public.competitor_watches w
  where w.property_id = p_property and w.status = 'active' order by w.added_at, w.id;
end;
$$;

revoke all on function public.update_competitor_watchlist(uuid, uuid[], uuid[], jsonb) from public, anon;
grant execute on function public.update_competitor_watchlist(uuid, uuid[], uuid[], jsonb) to authenticated;
