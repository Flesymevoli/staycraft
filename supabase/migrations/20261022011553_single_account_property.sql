begin;
-- Refuse ambiguous migrations rather than assigning data to an arbitrary account.
do $$ begin
 if exists(select 1 from public.properties p where (select count(*) from public.property_memberships m where m.property_id=p.id and role='owner')<>1)
 or exists(select 1 from public.property_memberships where role<>'owner')
 or exists(select 1 from public.property_memberships where role='owner' group by user_id having count(*)>1) then raise exception 'Ownership requires manual review before migration';end if;
end $$;
alter table public.properties add column owner_user_id uuid references auth.users(id);
update public.properties p set owner_user_id=m.user_id from public.property_memberships m where m.property_id=p.id and m.role='owner';
alter table public.properties alter column owner_user_id set not null;
alter table public.properties add constraint properties_one_per_account unique(owner_user_id);
drop policy if exists "members can read their property" on public.properties;
create policy "account reads own property" on public.properties for select to authenticated using(owner_user_id=(select auth.uid()));
create policy "account creates own property" on public.properties for insert to authenticated with check(owner_user_id=(select auth.uid()));
grant insert(owner_user_id,name) on public.properties to authenticated;
-- Preserve the old association rows for traceability, with no client access.
revoke all on public.property_memberships from authenticated;
drop policy if exists "members read property details" on public.property_details;
drop policy if exists "members insert property details" on public.property_details;
drop policy if exists "members update property details" on public.property_details;
drop policy if exists "members read inventory" on public.property_inventory;
drop policy if exists "members insert inventory" on public.property_inventory;
drop policy if exists "members update inventory" on public.property_inventory;
drop policy if exists "members read direct bookings" on public.direct_bookings;
do $$ declare target text; predicate text;begin
 foreach target in array array['property_details','property_inventory','direct_bookings'] loop
  predicate:=format('exists(select 1 from public.properties p where p.id=%I.property_id and p.owner_user_id=(select auth.uid()))',target);
  execute format('create policy "account reads own data" on public.%I for select to authenticated using(%s)',target,predicate);
  if target<>'direct_bookings' then
   execute format('create policy "account inserts own data" on public.%I for insert to authenticated with check(%s)',target,predicate);
   execute format('create policy "account updates own data" on public.%I for update to authenticated using(%s) with check(%s)',target,predicate,predicate);
  end if;
 end loop;
end $$;
drop policy if exists "members read room photos" on storage.objects;
drop policy if exists "members upload room photos" on storage.objects;
create policy "account reads own room photos" on storage.objects for select to authenticated using(bucket_id='room-photos' and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[1] and p.owner_user_id=(select auth.uid())));
create policy "account uploads own room photos" on storage.objects for insert to authenticated with check(bucket_id='room-photos' and exists(select 1 from public.properties p where p.id::text=(storage.foldername(name))[1] and p.owner_user_id=(select auth.uid())));
comment on table public.property_memberships is 'Legacy association records retained for migration traceability; application access uses properties.owner_user_id.';
commit;
