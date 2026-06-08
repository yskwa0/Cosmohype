-- Reset all users to cream-white theme (new default).
-- Users who want Cosmic Black can re-select it from Settings.
ALTER TABLE profiles ALTER COLUMN theme SET DEFAULT 'cream-white';
UPDATE profiles SET theme = 'cream-white';
