-- GDPR Art. 17: support complete erasure of a purged account.
-- Records when the scrub-in-place purge of the users row happened, and lets
-- a future hard DELETE of the users row succeed without orphaned messages.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_user_id_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_sender_user_id_fkey
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE;
