create table if not exists public.notification_settings (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  likes            boolean not null default true,
  comments         boolean not null default true,
  follows          boolean not null default true,
  dms              boolean not null default true,
  hype_results     boolean not null default true,
  announcements    boolean not null default true,
  updated_at       timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy "notification_settings_select_own" on public.notification_settings
  for select using (auth.uid() = user_id);

create policy "notification_settings_insert_own" on public.notification_settings
  for insert with check (auth.uid() = user_id);

create policy "notification_settings_update_own" on public.notification_settings
  for update using (auth.uid() = user_id);
