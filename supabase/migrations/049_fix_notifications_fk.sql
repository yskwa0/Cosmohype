-- notifications.actor_id / user_id が auth.users(id) を参照しているため
-- PostgREST が actor:profiles!notifications_actor_id_fkey の JOIN を解決できず
-- actor が常に null になり、通知一覧が空になる問題を修正する。
-- 他の社交テーブル (likes, follows, comments) と同様に profiles(id) を参照する。

-- ① profiles が存在しない actor の通知を削除（FK追加前に整合性確保）
DELETE FROM public.notifications
WHERE actor_id NOT IN (SELECT id FROM public.profiles);

-- ② profiles が存在しない user の通知を削除
DELETE FROM public.notifications
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- ③ actor_id FK を auth.users → profiles に付け替え
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ④ user_id FK を auth.users → profiles に付け替え
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
