-- Market quote batches: one row per local collection run. The app only reads these snapshots;
-- collection itself runs on the owner's machine (no browser in the deployed runtime).
-- Comparing batch N with batch N-1 gives the price movement the owner asked for.
create table if not exists public.market_quote_batches (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source text not null check (source in ('ctrip','rollinggo','manual','mixed')),
  captured_at timestamptz not null,
  window_start date not null,
  window_end date not null,
  quotes jsonb not null,
  quote_count integer not null check (quote_count >= 0),
  note text,
  created_at timestamptz not null default now()
  ,constraint market_quote_window_valid check (window_end >= window_start and window_end <= window_start + 27)
  ,constraint market_quote_array_valid check (jsonb_typeof(quotes) = 'array' and jsonb_array_length(quotes) = quote_count and quote_count between 1 and 20000)
  ,constraint market_quote_batch_identity unique(property_id,source,captured_at,window_start,window_end)
);

comment on table public.market_quote_batches is 'Immutable competitor quote snapshots produced by local collection; the app compares consecutive batches.';

create index if not exists market_quote_batches_property_captured
  on public.market_quote_batches(property_id, captured_at desc);

alter table public.market_quote_batches enable row level security;

create policy read_own_market_quote_batches on public.market_quote_batches for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_user_id = (select auth.uid())));

create policy insert_own_market_quote_batches on public.market_quote_batches for insert to authenticated
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_user_id = (select auth.uid())));

revoke all on public.market_quote_batches from anon,authenticated;
grant select, insert on public.market_quote_batches to authenticated;
