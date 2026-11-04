-- Additive diagnosis storage. Existing business records are not changed.
create table public.decision_agent_runs (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.properties(id) on delete cascade,
 language text not null check (language in ('zh','en')),
 fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
 period_start date not null,
 period_end date not null check (period_end >= period_start and period_end - period_start < 60),
 status text not null default 'running' check (status in ('running','completed','limited','failed')),
 engine text check (engine in ('model_v1','rules_v1')),
 steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps)='array' and octet_length(steps::text)<=32768),
 result jsonb check (result is null or (jsonb_typeof(result)='object' and octet_length(result::text)<=524288)),
 error text check (length(error)<=160),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz,
 check ((status='running' and completed_at is null) or status<>'running')
);
create index decision_agent_runs_history on public.decision_agent_runs(property_id,created_at desc);
create index decision_agent_runs_cache on public.decision_agent_runs(property_id,language,fingerprint,created_at desc);
create unique index decision_agent_runs_running on public.decision_agent_runs(property_id,language) where status='running';
alter table public.decision_agent_runs enable row level security;
revoke all on public.decision_agent_runs from public,anon,authenticated;
grant select,insert,update on public.decision_agent_runs to authenticated;
create policy decision_agent_runs_owner on public.decision_agent_runs for all to authenticated
 using (exists (select 1 from public.properties p where p.id=property_id and p.owner_user_id=(select auth.uid())))
 with check (exists (select 1 from public.properties p where p.id=property_id and p.owner_user_id=(select auth.uid())));
comment on table public.decision_agent_runs is 'Owner-scoped read-only AI investigation records; not bookings, prices or automatic actions.';
