-- 016_add_dm_rls.sql で誤って user_blocks を参照していた箇所を修正
--
-- 経緯:
--   - public.blocks テーブルは 007_add_reports_blocks.sql で作成済み
--   - 016 の is_dm_blocked() / user_blocks RLS は誤って user_blocks を参照していた
--   - アプリコードは一貫して .from('blocks') を使用しているため、
--     is_dm_blocked() を blocks に揃える

-- ── is_dm_blocked() を blocks テーブルを使うよう再定義 ─────────────

create or replace function public.is_dm_blocked(conv_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    join public.blocks b
      on  (b.blocker_id = cp.user_id and b.blocked_id  = auth.uid())
       or (b.blocker_id = auth.uid() and b.blocked_id  = cp.user_id)
    where cp.conversation_id = conv_id
      and cp.user_id <> auth.uid()
  )
$$;

-- ── user_blocks テーブルが誤って存在する場合はポリシーごと削除 ────

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_blocks'
  ) then
    drop policy if exists "user_blocks_select_own" on public.user_blocks;
    drop policy if exists "user_blocks_insert_own" on public.user_blocks;
    drop policy if exists "user_blocks_delete_own" on public.user_blocks;
    drop table public.user_blocks;
  end if;
end $$;
