-- Phase 2: コメント機能

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments(post_id, created_at);
create index if not exists comments_user_id_idx on public.comments(user_id);

alter table public.posts
  add column if not exists comments_count int not null default 0;

create or replace function public.update_comments_count()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.posts set comments_count = comments_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger comments_count_trigger
  after insert or delete on public.comments
  for each row execute function public.update_comments_count();

alter table public.comments enable row level security;

create policy "comments_select_all" on public.comments
  for select using (true);

create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "comments_delete_own" on public.comments
  for delete using (auth.uid() = user_id);
