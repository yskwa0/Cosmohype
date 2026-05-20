-- Phase 2 prep: ユーザーごとの背景テーマ設定
alter table public.profiles
  add column if not exists theme text not null default 'cosmic-black';
