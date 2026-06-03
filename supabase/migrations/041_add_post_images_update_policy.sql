-- post_images に UPDATE ポリシーを追加
-- PostEditForm で position_x / position_y を保存するために必要

create policy "post_images_update_own" on public.post_images
  for update
  using (
    auth.uid() = (select user_id from public.posts where id = post_id)
  )
  with check (
    auth.uid() = (select user_id from public.posts where id = post_id)
  );
