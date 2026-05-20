-- ============================================================
-- Cosmohype Phase 1 — Initial Schema
-- ============================================================

-- profiles テーブル
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  bio         text,
  avatar_url  text,
  website     text,
  style_tags  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- username のインデックス（検索用）
create index if not exists profiles_username_idx on public.profiles(username);

-- posts テーブル
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  caption     text,
  tags        text[] not null default '{}',
  brand_tags  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

-- post_images テーブル
create table if not exists public.post_images (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  url           text not null,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists post_images_post_id_idx on public.post_images(post_id, display_order);

-- updated_at 自動更新トリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;

-- profiles: 全員が読める、本人のみ書き込める
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- posts: 全員が読める、本人のみ作成・更新・削除
create policy "posts_select_all" on public.posts
  for select using (true);

create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "posts_update_own" on public.posts
  for update using (auth.uid() = user_id);

create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);

-- post_images: postsに準じる
create policy "post_images_select_all" on public.post_images
  for select using (true);

create policy "post_images_insert_own" on public.post_images
  for insert with check (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );

create policy "post_images_delete_own" on public.post_images
  for delete using (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );

-- ============================================================
-- Storage バケット
-- (Supabase Dashboard > Storage から作成する場合はSQL不要)
-- ============================================================

-- avatars バケット: 公開
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- posts バケット: 公開
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Storage RLS: avatars
create policy "avatars_select_all" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: posts
create policy "posts_storage_select_all" on storage.objects
  for select using (bucket_id = 'posts');

create policy "posts_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'posts' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "posts_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'posts' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
