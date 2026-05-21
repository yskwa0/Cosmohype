-- ============================================================
-- 017_fix_dm_block_check.sql
-- is_dm_blocked() を public.user_blocks から public.blocks へ修正
--
-- 背景:
--   UIのブロック操作（ProfileMenu / PostMenu）は public.blocks に書き込む。
--   migration 016 の is_dm_blocked() は public.user_blocks を参照していたため
--   ブロックが機能していなかった。正しいテーブルに差し替える。
--
-- blocks テーブルの RLS:
--   blocks_select_own: blocker_id = auth.uid() のみ閲覧可。
--   相手が自分をブロックしているかは RLS 経由では確認できないため、
--   引き続き SECURITY DEFINER で RLS をバイパスして双方向確認する。
-- ============================================================

create or replace function public.is_dm_blocked(conv_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.blocks b
      on  (b.blocker_id = cp.user_id  and b.blocked_id = auth.uid())
       or (b.blocker_id = auth.uid()  and b.blocked_id = cp.user_id)
    where cp.conversation_id = conv_id
      and cp.user_id <> auth.uid()
  )
$$;
