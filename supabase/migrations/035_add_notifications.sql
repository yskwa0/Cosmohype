-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id) WHERE NOT is_read;

-- partial unique: one like-notification per (user, actor, post)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_like_unique_idx
  ON notifications (user_id, actor_id, post_id)
  WHERE type = 'like';

-- partial unique: one follow-notification per (user, actor)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_follow_unique_idx
  ON notifications (user_id, actor_id)
  WHERE type = 'follow';

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- insert blocked for direct client writes (triggers use SECURITY DEFINER)
CREATE POLICY "no_direct_insert"
  ON notifications FOR INSERT
  WITH CHECK (false);

CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Trigger: like notification ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner uuid;
BEGIN
  SELECT user_id INTO v_post_owner FROM posts WHERE id = NEW.post_id;

  -- don't notify yourself
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, post_id)
  VALUES (v_post_owner, NEW.user_id, 'like', NEW.post_id)
  ON CONFLICT (user_id, actor_id, post_id) WHERE type = 'like'
  DO UPDATE SET is_read = false, created_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_like_notification ON likes;
CREATE TRIGGER trg_like_notification
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION create_like_notification();

-- ─── Trigger: comment notification ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner uuid;
BEGIN
  SELECT user_id INTO v_post_owner FROM posts WHERE id = NEW.post_id;

  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
  VALUES (v_post_owner, NEW.user_id, 'comment', NEW.post_id, NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_notification ON comments;
CREATE TRIGGER trg_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION create_comment_notification();

-- ─── Trigger: follow notification ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.following_id = NEW.follower_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow')
  ON CONFLICT (user_id, actor_id) WHERE type = 'follow'
  DO UPDATE SET is_read = false, created_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_follow_notification ON follows;
CREATE TRIGGER trg_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION create_follow_notification();
