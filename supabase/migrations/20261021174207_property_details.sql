-- Confirmed property information only. Raw uploaded files are not stored.
begin;
create table public.property_details (
  property_id uuid primary key references public.properties(id) on delete cascade,
  profile jsonb not null,
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now(),
  constraint property_details_shape check (
    jsonb_typeof(profile) = 'object'
    and profile ?& array['name','location','roomCount','breakfast','checkin','notes']
    and (profile - array['name','location','roomCount','breakfast','checkin','notes']) = '{}'::jsonb
    and jsonb_typeof(profile->'name') = 'string'
    and jsonb_typeof(profile->'location') = 'string'
    and jsonb_typeof(profile->'roomCount') = 'string'
    and jsonb_typeof(profile->'breakfast') = 'string'
    and jsonb_typeof(profile->'checkin') = 'string'
    and jsonb_typeof(profile->'notes') = 'string'
    and length(trim(profile->>'name')) between 1 and 120
    and length(profile->>'location') <= 300
    and length(profile->>'notes') <= 2000
    and ((profile->>'roomCount') = '' or (profile->>'roomCount') ~ '^[1-9][0-9]{0,2}$')
    and ((profile->>'checkin') = '' or (profile->>'checkin') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and ((profile->>'breakfast') = '' or (
      (profile->>'breakfast') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]–([01][0-9]|2[0-3]):[0-5][0-9]$'
      and substring(profile->>'breakfast',1,5) < substring(profile->>'breakfast',7,5)
    ))
  )
);
alter table public.property_details enable row level security;
revoke all on public.property_details from public, anon, authenticated;
grant select, insert, update on public.property_details to authenticated;

create policy "members read property details" on public.property_details
  for select to authenticated using (exists (
    select 1 from public.property_memberships m where m.property_id = property_details.property_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','manager')
  ));
create policy "members insert property details" on public.property_details
  for insert to authenticated with check (exists (
    select 1 from public.property_memberships m where m.property_id = property_details.property_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','manager')
  ));
create policy "members update property details" on public.property_details
  for update to authenticated using (exists (
    select 1 from public.property_memberships m where m.property_id = property_details.property_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','manager')
  )) with check (exists (
    select 1 from public.property_memberships m where m.property_id = property_details.property_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','manager')
  ));
commit;
