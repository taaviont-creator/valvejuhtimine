alter table public.simulation_snapshots
add column if not exists classroom_exercise_id text;

alter table public.simulation_snapshots
add column if not exists group_name text;

alter table public.simulation_snapshots
add column if not exists group_index integer;

create table if not exists public.classroom_exercises (
  id text primary key,
  title text not null,
  teacher_code text not null unique,
  group_count integer not null,
  groups jsonb not null,
  shared_scenario_events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classroom_exercises
add column if not exists shared_scenario_events jsonb not null default '[]'::jsonb;

alter table public.classroom_exercises enable row level security;

drop policy if exists "demo classroom exercises are readable" on public.classroom_exercises;
create policy "demo classroom exercises are readable"
on public.classroom_exercises
for select
using (true);

drop policy if exists "demo classroom exercises are writable" on public.classroom_exercises;
create policy "demo classroom exercises are writable"
on public.classroom_exercises
for all
using (true)
with check (true);

create index if not exists simulation_snapshots_classroom_exercise_idx
on public.simulation_snapshots (classroom_exercise_id);

create index if not exists classroom_exercises_teacher_code_idx
on public.classroom_exercises (teacher_code);
