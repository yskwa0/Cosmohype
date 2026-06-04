-- profiles に is_admin フラグを追加
-- 運営アカウントのみ true に設定する。初期値は全員 false。
-- 有効化: update public.profiles set is_admin = true where username = '運営ユーザー名';

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is '運営者フラグ。true のアカウントのみ管理者専用UIを表示する';
