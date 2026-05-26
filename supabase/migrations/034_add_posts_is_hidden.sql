-- 投稿を削除せず非表示にできる管理用フラグ
alter table public.posts
  add column if not exists is_hidden boolean not null default false;
