CREATE TABLE IF NOT EXISTS hype_participations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hype_theme text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hype_theme)
);

CREATE INDEX IF NOT EXISTS hype_participations_theme_idx ON hype_participations (hype_theme, created_at DESC);

ALTER TABLE hype_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_hype_participations"
  ON hype_participations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_insert_own_hype_participation"
  ON hype_participations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_hype_participation"
  ON hype_participations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
