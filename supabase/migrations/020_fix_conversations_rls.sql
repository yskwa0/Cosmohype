-- 016_add_dm_rls で定義したポリシー・関数が未適用の場合の補完マイグレーション
-- drop if exists → create で冪等に実行できる

-- ── SECURITY DEFINER ヘルパー関数（未適用の場合に備えて再定義）────────────

create or replace function public.get_my_conversation_ids()
returns setof uuid
language sql security definer stable
set search_path = public
as $$
  select conversation_id
  from public.conversation_participants
  where user_id = auth.uid()
$$;

create or replace function public.can_add_dm_participant(conv_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select
    count(*)    = 1
    and bool_or(user_id = auth.uid())
  from public.conversation_participants
  where conversation_id = conv_id
$$;

create or replace function public.is_dm_blocked(conv_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.user_blocks ub
      on  (ub.blocker_id = cp.user_id and ub.blocked_id  = auth.uid())
       or (ub.blocker_id = auth.uid() and ub.blocked_id  = cp.user_id)
    where cp.conversation_id = conv_id
      and cp.user_id <> auth.uid()
  )
$$;

-- ── conversations ─────────────────────────────────────────────────────────────

alter table public.conversations enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
  for select using (
    id in (select public.get_my_conversation_ids())
  );

drop policy if exists "conversations_insert_auth" on public.conversations;
create policy "conversations_insert_auth" on public.conversations
  for insert with check (auth.uid() is not null);

-- ── conversation_participants ──────────────────────────────────────────────────

alter table public.conversation_participants enable row level security;

drop policy if exists "conv_participants_select" on public.conversation_participants;
create policy "conv_participants_select" on public.conversation_participants
  for select using (
    conversation_id in (select public.get_my_conversation_ids())
  );

drop policy if exists "conv_participants_insert" on public.conversation_participants;
create policy "conv_participants_insert" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or public.can_add_dm_participant(conversation_participants.conversation_id)
  );

drop policy if exists "conv_participants_update_own" on public.conversation_participants;
create policy "conv_participants_update_own" on public.conversation_participants
  for update using (user_id = auth.uid());
