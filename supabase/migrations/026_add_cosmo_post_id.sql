-- profiles に cosmo_post_id を追加
-- ユーザーが COSMO に表示したい投稿を1件だけ指定できる
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cosmo_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
