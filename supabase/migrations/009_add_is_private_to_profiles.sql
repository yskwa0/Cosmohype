alter table public.profiles
  add column if not exists is_private boolean not null default false;

-- TODO: COSMOへの表示を is_private とは独立して制御したい場合は以下を追加する
-- alter table public.profiles
--   add column if not exists cosmo_visible boolean not null default true;
