import { ServiceBusClient } from '@azure/service-bus';
import { config } from '../config.js';
import { withTransaction } from '../db/pool.js';
import { revokeDeviceKeys } from './keys.js';

const DELETION_GRACE_DAYS = 30;

export async function scheduleDeletion(userId: string) {
  const scheduled = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

  // Status flip + audit row commit together; the Service Bus send happens
  // after commit so a queued purge always has a matching deletion request.
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET status = 'deletion_pending' WHERE id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO deletion_requests (user_id, scheduled_purge_at)
       VALUES ($1, $2)`,
      [userId, scheduled.toISOString()],
    );
  });

  if (config.serviceBusConnectionString) {
    const client = new ServiceBusClient(config.serviceBusConnectionString);
    const sender = client.createSender(config.serviceBusDeletionQueue);
    await sender.scheduleMessages(
      { body: { userId, scheduledPurgeAt: scheduled.toISOString() } },
      scheduled,
    );
    await sender.close();
    await client.close();
  }

  return { scheduledPurgeAt: scheduled.toISOString() };
}

export async function cancelDeletion(userId: string) {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE deletion_requests SET cancelled_at = now()
       WHERE user_id = $1 AND cancelled_at IS NULL`,
      [userId],
    );
    await client.query(`UPDATE users SET status = 'active' WHERE id = $1`, [userId]);
  });
}

/**
 * GDPR Art. 17 erasure: removes credentials, identities, content, and
 * free-text reports, then scrubs the users row in place (kept for the
 * deletion_requests audit trail).
 *
 * Runs as one transaction so a mid-flow crash can never leave a partially
 * erased account that still looks active; the purge worker can safely retry.
 */
export async function purgeUserAccount(userId: string) {
  await withTransaction(async (client) => {
    await revokeDeviceKeys(userId, undefined, client);
    // All messages in conversations the user participated in, not just ones they sent
    await client.query(
      `DELETE FROM messages
       WHERE sender_user_id = $1
          OR conversation_id IN (
            SELECT conversation_id FROM conversation_members WHERE user_id = $1
          )`,
      [userId],
    );
    await client.query('DELETE FROM message_receipts WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM media_objects WHERE owner_id = $1', [userId]);
    await client.query('DELETE FROM profiles WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM device_public_keys WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM conversation_members WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM local_accounts WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM oauth_identities WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM session_refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM error_reports WHERE user_id = $1', [userId]);
    await client.query(
      'DELETE FROM user_blocks WHERE blocker_user_id = $1 OR blocked_user_id = $1',
      [userId],
    );
    await client.query(
      `UPDATE users
       SET entra_oid = 'purged:' || id::text,
           is_admin = false,
           status = 'purged',
           purged_at = now()
       WHERE id = $1`,
      [userId],
    );
  });
}

export async function lockAccountPanic(userId: string) {
  // Key revocation, token deletion, and the status flip commit together so a
  // panic lock can never half-apply.
  await withTransaction(async (client) => {
    await revokeDeviceKeys(userId, undefined, client);
    await client.query('DELETE FROM session_refresh_tokens WHERE user_id = $1', [userId]);
    await client.query(`UPDATE users SET status = 'locked' WHERE id = $1`, [userId]);
  });
}
