-- Competitor watchlist: a small fixed set of hotels the owner tracks over time so that
-- price comparisons are between the same properties. Retiring keeps the history.
create table if not exists public.competitor_watches (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  hotel_id text not null,
  hotel_name text not null,
  room_class text,
  source text not null default 'rollinggo' check (source in ('rollinggo','manual')),
  status text not null default 'active' check (status in ('active','retired')),
  added_at timestamptz not null default now(),
  retired_at timestamptz
);

comment on table public.competitor_watches is 'Owner-selected competitor hotels tracked over time; comparisons only make sense for the same active set.';

-- One active row per hotel per property; retired rows stay for history.
create unique index if not exists competitor_watches_active_unique
  on public.competitor_watches(property_id, hotel_id) where status = 'active';

create index if not exists competitor_watches_property_status
  on public.competitor_watches(property_id, status);

alter table public.competitor_watches enable row level security;

create policy own_competitor_watches on public.competitor_watches for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_user_id = auth.uid()));

grant select, insert, update, delete on public.competitor_watches to authenticated;
