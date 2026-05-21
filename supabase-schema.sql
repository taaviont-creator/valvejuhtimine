create table if not exists public.simulation_snapshots (
  id text primary key,
  join_code text not null unique,
  teacher_code text unique,
  student_code text unique,
  classroom_exercise_id text,
  group_name text,
  group_index integer,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.classroom_exercises (
  id text primary key,
  title text not null,
  teacher_code text not null unique,
  group_count integer not null,
  groups jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.simulation_snapshots enable row level security;
alter table public.classroom_exercises enable row level security;

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

create index if not exists simulation_snapshots_join_code_idx
on public.simulation_snapshots (join_code);

create index if not exists simulation_snapshots_teacher_code_idx
on public.simulation_snapshots (teacher_code);

create index if not exists simulation_snapshots_student_code_idx
on public.simulation_snapshots (student_code);

create index if not exists simulation_snapshots_classroom_exercise_idx
on public.simulation_snapshots (classroom_exercise_id);

create index if not exists classroom_exercises_teacher_code_idx
on public.classroom_exercises (teacher_code);
