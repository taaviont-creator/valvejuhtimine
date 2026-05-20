create table if not exists public.simulation_snapshots (
  id text primary key,
  join_code text not null unique,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.simulation_snapshots enable row level security;

drop policy if exists "demo simulations are readable" on public.simulation_snapshots;
create policy "demo simulations are readable"
on public.simulation_snapshots
for select
using (true);

drop policy if exists "demo simulations are writable" on public.simulation_snapshots;
create policy "demo simulations are writable"
on public.simulation_snapshots
for all
using (true)
with check (true);

create index if not exists simulation_snapshots_join_code_idx
on public.simulation_snapshots (join_code);
