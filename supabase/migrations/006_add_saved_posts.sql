-- Phase 2: 保存機能

create table if not exists public.saved_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index if not exists saved_posts_user_id_idx on public.saved_posts(user_id, created_at desc);

alter table public.saved_posts enable row level security;

create policy "saved_posts_select_own" on public.saved_posts
  for select using (auth.uid() = user_id);

create policy "saved_posts_insert_own" on public.saved_posts
  for insert with check (auth.uid() = user_id);

create policy "saved_posts_delete_own" on public.saved_posts
  for delete using (auth.uid() = user_id);
