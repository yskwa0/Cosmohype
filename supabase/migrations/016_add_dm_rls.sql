-- ============================================================
-- DM テーブル RLS — 016_add_dm_rls.sql
-- ============================================================
-- 設計上の注意:
--   conversation_participants は自己参照 RLS ループを起こすため、
--   SECURITY DEFINER 関数経由で参照する。
--   user_blocks の双方向ブロック確認も同様に SECURITY DEFINER を使う。
-- ============================================================

-- ── ヘルパー関数 ──────────────────────────────────────────────

-- 自分が参加している conversation_id 一覧を返す
-- conversation_participants の SELECT policy が同テーブルを参照すると再帰するため
-- SECURITY DEFINER で RLS をバイパスして取得する
create or replace function public.get_my_conversation_ids()
returns setof uuid
language sql security definer stable
set search_path = public
as $$
  select conversation_id
  from public.conversation_participants
  where user_id = auth.uid()
$$;

-- 自分のみが参加中の会話に相手を追加できるか判定
-- 1:1 DM 開始フロー: 作成者が自分を追加した後、相手を 1 人だけ追加できる
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

-- 双方向ブロック確認: 自分が相手をブロック、または相手が自分をブロックしていれば true
-- user_blocks の SELECT policy は blocker_id = auth.uid() のみ閲覧可のため、
-- 相手側のブロック行は RLS 経由では見えない → SECURITY DEFINER でバイパス
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

-- ── conversations ─────────────────────────────────────────────

alter table public.conversations enable row level security;

-- 自分が参加している会話のみ閲覧可
create policy "conversations_select_participant" on public.conversations
  for select using (
    id in (select public.get_my_conversation_ids())
  );

-- 認証済みユーザーが会話を作成できる
-- （作成直後に conversation_participants へ自分と相手を INSERT するフロー前提）
create policy "conversations_insert_auth" on public.conversations
  for insert with check (auth.uid() is not null);

-- ── conversation_participants ──────────────────────────────────

alter table public.conversation_participants enable row level security;

-- 自分が参加している会話の全参加者行を閲覧（相手プロフィール表示に必要）
create policy "conv_participants_select" on public.conversation_participants
  for select using (
    conversation_id in (select public.get_my_conversation_ids())
  );

-- (1) 自分を追加する
-- (2) または、自分のみが参加中の会話に相手を 1 人追加する（1:1 DM 開始）
create policy "conv_participants_insert" on public.conversation_participants
  for insert with check (
    user_id = auth.uid()
    or public.can_add_dm_participant(conversation_participants.conversation_id)
  );

-- 自分の参加者行のみ更新（last_read_at 既読マーク用）
create policy "conv_participants_update_own" on public.conversation_participants
  for update using (user_id = auth.uid());

-- ── messages ──────────────────────────────────────────────────

alter table public.messages enable row level security;

-- 参加者のみメッセージを閲覧可
create policy "messages_select_participant" on public.messages
  for select using (
    conversation_id in (select public.get_my_conversation_ids())
  );

-- 参加者として送信 かつ 双方向ブロックがない場合のみ INSERT 可
create policy "messages_insert_participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and conversation_id in (select public.get_my_conversation_ids())
    and not public.is_dm_blocked(messages.conversation_id)
  );

-- ── user_blocks ───────────────────────────────────────────────

alter table public.user_blocks enable row level security;

-- 自分がブロックした相手の一覧のみ閲覧（相手から見えない）
create policy "user_blocks_select_own" on public.user_blocks
  for select using (blocker_id = auth.uid());

-- 自分がブロック操作（blocker_id = 自分）
create policy "user_blocks_insert_own" on public.user_blocks
  for insert with check (blocker_id = auth.uid());

-- 自分のブロックのみ解除
create policy "user_blocks_delete_own" on public.user_blocks
  for delete using (blocker_id = auth.uid());
