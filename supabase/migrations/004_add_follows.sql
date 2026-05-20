-- Phase 2: フォロー機能

create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id)
);

create index if not exists follows_follower_id_idx  on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

-- profiles にカウントカラムを追加
alter table public.profiles
  add column if not exists followers_count int not null default 0;
alter table public.profiles
  add column if not exists following_count int not null default 0;

-- フォロー時にカウントを自動更新するトリガー
create or replace function public.update_follow_counts()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update public.profiles set followers_count = followers_count + 1 where id = NEW.following_id;
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
  elsif (TG_OP = 'DELETE') then
    update public.profiles set followers_count = followers_count - 1 where id = OLD.following_id;
    update public.profiles set following_count = following_count - 1 where id = OLD.follower_id;
  end if;
  return null;
end;
$$;

create trigger follow_counts_trigger
  after insert or delete on public.follows
  for each row execute function public.update_follow_counts();

-- RLS
alter table public.follows enable row level security;

create policy "follows_select_all" on public.follows
  for select using (true);

create policy "follows_insert_own" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "follows_delete_own" on public.follows
  for delete using (auth.uid() = follower_id);
