create table if not exists public.style_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result text not null,
  created_at timestamptz not null default now()
);

alter table public.style_diagnoses enable row level security;

create policy "Users can select own diagnoses"
  on public.style_diagnoses for select
  using (auth.uid() = user_id);

create policy "Users can insert own diagnoses"
  on public.style_diagnoses for insert
  with check (auth.uid() = user_id);
