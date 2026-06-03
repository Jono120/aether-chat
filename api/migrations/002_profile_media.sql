ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS allow_profile_media_upload BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_album_media_upload BOOLEAN NOT NULL DEFAULT true;
