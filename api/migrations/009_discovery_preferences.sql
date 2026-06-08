ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS discovery_filters JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_view_prefs JSONB NOT NULL DEFAULT '{}';
