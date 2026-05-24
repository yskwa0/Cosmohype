-- 非公開アカウント制御: posts / post_images / comments の SELECT を
-- 「本人 OR フォロワー OR 公開アカウント」に限定する
--
-- 前提確認済み:
--   - posts/post_images の RLS は 001_initial で enable 済み
--   - comments の RLS は 005_add_comments で enable 済み
--   - follows は select true ポリシーがあり、exists サブクエリは全ユーザーが参照可能
--   - posts の既存 SELECT ポリシーは posts_select_all のみ (001)
--   - post_images の既存 SELECT ポリシーは post_images_select_all のみ (001)
--   - comments の既存 SELECT ポリシーは comments_select_all のみ (005)

-- RLS が有効であることを保証 (enable は idempotent)
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.comments enable row level security;

-- ① posts
-- 既存の全公開 SELECT ポリシーを削除してから privacy-aware に差し替える
drop policy if exists "posts_select_all" on public.posts;

create policy "posts_select_privacy" on public.posts
  for select using (
    -- 本人の投稿は常に見える
    auth.uid() = user_id
    -- 公開アカウントの投稿は誰でも見える (is_private が null の場合も公開扱い)
    or not coalesce(
      (select is_private from public.profiles where id = user_id),
      false
    )
    -- 非公開でもフォロワーは見える
    or exists (
      select 1
      from public.follows
      where follower_id = auth.uid()
        and following_id = user_id
    )
  );

-- ② post_images (posts に準じる)
drop policy if exists "post_images_select_all" on public.post_images;

create policy "post_images_select_privacy" on public.post_images
  for select using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          auth.uid() = p.user_id
          or not coalesce(
            (select is_private from public.profiles where id = p.user_id),
            false
          )
          or exists (
            select 1
            from public.follows
            where follower_id = auth.uid()
              and following_id = p.user_id
          )
        )
    )
  );

-- ③ comments (posts に準じる — 非公開投稿のコメントは非フォロワーに見せない)
drop policy if exists "comments_select_all" on public.comments;

create policy "comments_select_privacy" on public.comments
  for select using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          auth.uid() = p.user_id
          or not coalesce(
            (select is_private from public.profiles where id = p.user_id),
            false
          )
          or exists (
            select 1
            from public.follows
            where follower_id = auth.uid()
              and following_id = p.user_id
          )
        )
    )
  );
