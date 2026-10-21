begin;
create function public.valid_property_inventory(doc jsonb, property uuid) returns boolean
language plpgsql immutable set search_path = '' as $$
declare t jsonb; r jsonb;
begin
  if jsonb_typeof(doc) <> 'object' or not doc ?& array['types','rooms'] or (doc-array['types','rooms']) <> '{}'::jsonb
    or jsonb_typeof(doc->'types') <> 'array' or jsonb_typeof(doc->'rooms') <> 'array'
    or jsonb_array_length(doc->'types') > 20 or jsonb_array_length(doc->'rooms') > 200 or octet_length(doc::text)>160000 then return false; end if;
  for t in select value from jsonb_array_elements(doc->'types') loop
    if jsonb_typeof(t)<>'object' or not t ?& array['id','name','beds','capacity','price','photo'] or (t-array['id','name','beds','capacity','price','photo'])<>'{}'::jsonb
      or jsonb_typeof(t->'id')<>'string' or (t->>'id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or jsonb_typeof(t->'name')<>'string' or length(trim(t->>'name')) not between 1 and 60
      or jsonb_typeof(t->'beds')<>'string' or length(trim(t->>'beds')) not between 1 and 80
      or jsonb_typeof(t->'capacity')<>'number' or (t->>'capacity')::numeric not between 1 and 12 or (t->>'capacity')::numeric <> trunc((t->>'capacity')::numeric)
      or jsonb_typeof(t->'price')<>'number' or (t->>'price')::numeric not between 0.01 and 99999 or (t->>'price')::numeric<>round((t->>'price')::numeric,2)
      or jsonb_typeof(t->'photo')<>'string'
      or ((t->>'photo')<>'' and ((t->>'photo') !~* '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$' or split_part(t->>'photo','/',1)<>property::text)) then return false; end if;
  end loop;
  for r in select value from jsonb_array_elements(doc->'rooms') loop
    if jsonb_typeof(r)<>'object' or not r ?& array['id','number','floor','typeId','housekeeping','active'] or (r-array['id','number','floor','typeId','housekeeping','active'])<>'{}'::jsonb
      or jsonb_typeof(r->'id')<>'string' or (r->>'id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
      or jsonb_typeof(r->'number')<>'string' or length(trim(r->>'number')) not between 1 and 24
      or jsonb_typeof(r->'floor')<>'string' or length(trim(r->>'floor')) not between 1 and 30
      or jsonb_typeof(r->'housekeeping')<>'string' or jsonb_typeof(r->'active')<>'boolean' or (r->>'housekeeping') not in ('clean','dirty')
      or not exists(select 1 from jsonb_array_elements(doc->'types') x where x->>'id'=r->>'typeId') then return false; end if;
  end loop;
  if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(doc->'types') x)
    or (select count(*)<>count(distinct x->>'id') or count(*)<>count(distinct lower(trim(x->>'number'))) from jsonb_array_elements(doc->'rooms') x) then return false; end if;
  return true;
exception when others then return false;
end $$;
revoke all on function public.valid_property_inventory(jsonb,uuid) from public,anon;
grant execute on function public.valid_property_inventory(jsonb,uuid) to authenticated;
create table public.property_inventory(
 property_id uuid primary key references public.properties(id) on delete cascade,
 inventory jsonb not null default '{"types":[],"rooms":[]}'::jsonb,
 revision uuid not null default gen_random_uuid(),
 updated_at timestamptz not null default now(),
 constraint inventory_valid check(public.valid_property_inventory(inventory,property_id))
);
alter table public.property_inventory enable row level security;
revoke all on public.property_inventory from public,anon,authenticated;
grant select,insert,update on public.property_inventory to authenticated;
create policy "members read inventory" on public.property_inventory for select to authenticated using(exists(select 1 from public.property_memberships m where m.property_id=property_inventory.property_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "members insert inventory" on public.property_inventory for insert to authenticated with check(exists(select 1 from public.property_memberships m where m.property_id=property_inventory.property_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "members update inventory" on public.property_inventory for update to authenticated using(exists(select 1 from public.property_memberships m where m.property_id=property_inventory.property_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))) with check(exists(select 1 from public.property_memberships m where m.property_id=property_inventory.property_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create function public.preserve_inventory_room_ids() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from jsonb_array_elements(old.inventory->'rooms') r where not exists(select 1 from jsonb_array_elements(new.inventory->'rooms') n where n->>'id'=r->>'id')) then raise exception 'Archive existing rooms instead of deleting' using errcode='23514';end if;
 return new;
end $$;
revoke all on function public.preserve_inventory_room_ids() from public,anon,authenticated;
create trigger preserve_inventory_rooms before update on public.property_inventory for each row execute function public.preserve_inventory_room_ids();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('room-photos','room-photos',false,262144,array['image/webp']);
create policy "members read room photos" on storage.objects for select to authenticated using(bucket_id='room-photos' and exists(select 1 from public.property_memberships m where m.property_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "members upload room photos" on storage.objects for insert to authenticated with check(bucket_id='room-photos' and exists(select 1 from public.property_memberships m where m.property_id::text=(storage.foldername(name))[1] and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
commit;
