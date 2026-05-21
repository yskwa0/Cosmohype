alter table public.posts
  add column if not exists is_archived boolean not null default false;

create index if not exists posts_user_archived_idx on public.posts(user_id, is_archived);
