alter table profiles
  add column if not exists is_official            boolean not null default false,
  add column if not exists is_cosmohype_creator   boolean not null default false;

comment on column profiles.is_official           is '運営が認証した公式アカウント/ブランドフラグ';
comment on column profiles.is_cosmohype_creator  is 'Cosmohype公認クリエイターフラグ';
