-- Track username changes to enforce per-user monthly limit (max 2 per calendar month)
create table if not exists username_changes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  changed_at timestamptz not null default now()
);

alter table username_changes enable row level security;

create policy "Users can view own username changes"
  on username_changes for select
  using (auth.uid() = user_id);

create policy "Users can insert own username changes"
  on username_changes for insert
  with check (auth.uid() = user_id);
