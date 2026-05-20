alter table public.simulation_snapshots
add column if not exists teacher_code text;

alter table public.simulation_snapshots
add column if not exists student_code text;

update public.simulation_snapshots
set student_code = join_code
where student_code is null;

create unique index if not exists simulation_snapshots_teacher_code_unique_idx
on public.simulation_snapshots (teacher_code)
where teacher_code is not null;

create unique index if not exists simulation_snapshots_student_code_unique_idx
on public.simulation_snapshots (student_code)
where student_code is not null;

create index if not exists simulation_snapshots_teacher_code_idx
on public.simulation_snapshots (teacher_code);

create index if not exists simulation_snapshots_student_code_idx
on public.simulation_snapshots (student_code);
