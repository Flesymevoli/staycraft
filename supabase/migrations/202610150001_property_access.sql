-- Single-property MVP access boundary. Apply only after a Supabase project exists.
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.property_memberships (
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  primary key (property_id, user_id)
);

create index property_memberships_user_id_idx on public.property_memberships(user_id);

alter table public.properties enable row level security;
alter table public.property_memberships enable row level security;

-- Membership records are provisioned by the project administrator. Clients cannot
-- create a property or grant themselves access via the public API.
create policy "members can read their own membership"
  on public.property_memberships for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "members can read their property"
  on public.properties for select to authenticated
  using (exists (
    select 1 from public.property_memberships m
    where m.property_id = properties.id and m.user_id = (select auth.uid())
  ));
