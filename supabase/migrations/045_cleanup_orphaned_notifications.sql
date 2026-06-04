-- ─── 既存の孤立通知を削除 ─────────────────────────────────────────────────────

-- 非表示投稿 (is_hidden = true) への like/comment 通知を削除
-- これらは通知リストに表示されず badge だけが残る原因になる
DELETE FROM public.notifications n
WHERE n.post_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = n.post_id AND p.is_hidden = true
  );

-- actor の profiles が存在しない通知を削除（開発中の孤立データ）
-- actor_id は auth.users(id) ON DELETE CASCADE で保護されるが、
-- profiles が別途削除された場合に孤立通知が残ることがある
DELETE FROM public.notifications n
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = n.actor_id
);

-- ─── 投稿が非表示化された時に通知を自動削除するトリガー ────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_notifications_on_post_hidden()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- is_hidden が false→true に変わった時だけ削除
  IF NEW.is_hidden = true AND (OLD.is_hidden = false OR OLD.is_hidden IS NULL) THEN
    DELETE FROM notifications WHERE post_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_notifications_on_post_hidden ON public.posts;
CREATE TRIGGER trg_cleanup_notifications_on_post_hidden
  AFTER UPDATE OF is_hidden ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_notifications_on_post_hidden();
