alter table public.profiles
  add column if not exists follow_activity_last_read_at timestamptz;
