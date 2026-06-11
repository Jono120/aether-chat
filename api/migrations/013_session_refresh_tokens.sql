-- Server-side session management: rotating refresh tokens with revocation.
CREATE TABLE IF NOT EXISTS session_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES session_refresh_tokens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_refresh_user
  ON session_refresh_tokens (user_id) WHERE revoked_at IS NULL;
