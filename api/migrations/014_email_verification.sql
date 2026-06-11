-- Email verification for local accounts. Token storage mirrors
-- password_reset_tokens: row id locates the record, only a salted scrypt hash
-- of the secret is stored.
ALTER TABLE local_accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user
  ON email_verification_tokens (user_id) WHERE used_at IS NULL;
