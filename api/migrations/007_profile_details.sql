ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say')),
  ADD COLUMN IF NOT EXISTS looking_for JSONB NOT NULL DEFAULT '[]';
