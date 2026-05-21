-- ============================================================
-- 018_add_get_unread_counts.sql
-- DM未読数を会話ごとに返す RPC 関数
--
-- last_read_at カラムは conversation_participants に既存（migration 015）。
-- SECURITY DEFINER で RLS をバイパスし、相手メッセージを正確にカウントする。
-- ============================================================

create or replace function public.get_unread_counts()
returns table(conversation_id uuid, unread_count bigint)
language sql security definer stable
set search_path = public
as $$
  select
    cp.conversation_id,
    count(m.id) as unread_count
  from public.conversation_participants cp
  left join public.messages m
    on  m.conversation_id = cp.conversation_id
    and m.sender_id != auth.uid()
    and m.created_at > coalesce(cp.last_read_at, '-infinity'::timestamptz)
  where cp.user_id = auth.uid()
  group by cp.conversation_id
$$;
