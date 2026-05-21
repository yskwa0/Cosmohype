-- post_items テーブル
create table if not exists public.post_items (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  item_name     text not null,
  category      text not null,
  color         text,
  silhouette    text,
  genre         text,
  purchase_url  text,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists post_items_post_id_idx on public.post_items(post_id, display_order);

-- RLS
alter table public.post_items enable row level security;

create policy "post_items_select_all" on public.post_items
  for select using (true);

create policy "post_items_insert_own" on public.post_items
  for insert with check (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );

create policy "post_items_update_own" on public.post_items
  for update using (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );

create policy "post_items_delete_own" on public.post_items
  for delete using (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );
