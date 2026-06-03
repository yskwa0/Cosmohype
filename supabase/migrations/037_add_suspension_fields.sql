alter table profiles
  add column if not exists is_suspended   boolean     not null default false,
  add column if not exists suspended_at   timestamptz,
  add column if not exists suspension_reason text;

comment on column profiles.is_suspended      is '運営による停止フラグ。true の場合、ユーザーはアプリにアクセスできない';
comment on column profiles.suspended_at      is 'アカウントを停止した日時';
comment on column profiles.suspension_reason is '停止理由（運営管理用メモ）';
