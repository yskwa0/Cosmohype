-- 非公開アカウントへのフォロー申請テーブル
-- 公開アカウントへのフォローは従来どおり follows に直接 INSERT
-- 非公開アカウントへのフォローはここに INSERT し、承認時に follows へ移す

create table if not exists public.follow_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (requester_id, target_id)
);

create index if not exists follow_requests_requester_idx on public.follow_requests(requester_id);
create index if not exists follow_requests_target_idx    on public.follow_requests(target_id);

alter table public.follow_requests enable row level security;

-- 申請者と申請先本人のみ参照可能
create policy "follow_requests_select" on public.follow_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);

-- 自分が申請者のときのみ INSERT
create policy "follow_requests_insert" on public.follow_requests
  for insert with check (auth.uid() = requester_id);

-- 申請者（キャンセル）または申請先（却下）のみ DELETE
create policy "follow_requests_delete" on public.follow_requests
  for delete using (auth.uid() = requester_id or auth.uid() = target_id);
