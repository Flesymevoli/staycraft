-- Account-scoped promotion references and editable draft snapshots.
begin;
create table public.promotion_workspaces (
 property_id uuid primary key references public.properties(id) on delete cascade,
 state jsonb not null default '{"sources":[],"drafts":[]}'::jsonb,
 revision uuid not null default gen_random_uuid(),
 updated_at timestamptz not null default now(),
 constraint promotion_workspace_shape check (
  jsonb_typeof(state)='object' and state ?& array['sources','drafts']
  and state-array['sources','drafts']='{}'::jsonb
  and jsonb_typeof(state->'sources')='array' and jsonb_typeof(state->'drafts')='array'
  and jsonb_array_length(state->'sources')<=12 and jsonb_array_length(state->'drafts')<=20
  and octet_length(state::text)<=200000
 )
);
alter table public.promotion_workspaces enable row level security;
revoke all on public.promotion_workspaces from public,anon,authenticated;
grant select,insert,update on public.promotion_workspaces to authenticated;
create policy "members read promotion workspace" on public.promotion_workspaces
 for select to authenticated using (exists (
  select 1 from public.properties p where p.id=promotion_workspaces.property_id
  and p.owner_user_id=(select auth.uid())
 ));
create policy "members create promotion workspace" on public.promotion_workspaces
 for insert to authenticated with check (exists (
  select 1 from public.properties p where p.id=promotion_workspaces.property_id
  and p.owner_user_id=(select auth.uid())
 ));
create policy "members update promotion workspace" on public.promotion_workspaces
 for update to authenticated using (exists (
  select 1 from public.properties p where p.id=promotion_workspaces.property_id
  and p.owner_user_id=(select auth.uid())
 )) with check (exists (
  select 1 from public.properties p where p.id=promotion_workspaces.property_id
  and p.owner_user_id=(select auth.uid())
 ));
commit;
