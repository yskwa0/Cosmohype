-- Phase 3: 通報・ブロック機能

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('post', 'user')),
  target_id    uuid not null,
  reason       text not null,
  created_at   timestamptz not null default now()
);

create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists reports_target_id_idx   on public.reports(target_id);

alter table public.reports enable row level security;

create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "reports_select_own" on public.reports
  for select using (auth.uid() = reporter_id);

-- ブロックテーブル
create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists blocks_blocker_id_idx on public.blocks(blocker_id);
create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);

alter table public.blocks enable row level security;

create policy "blocks_select_own" on public.blocks
  for select using (auth.uid() = blocker_id);

create policy "blocks_insert_own" on public.blocks
  for insert with check (auth.uid() = blocker_id);

create policy "blocks_delete_own" on public.blocks
  for delete using (auth.uid() = blocker_id);
