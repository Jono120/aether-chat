import { ServiceBusClient } from '@azure/service-bus';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { revokeDeviceKeys } from './keys.js';

const DELETION_GRACE_DAYS = 30;

export async function scheduleDeletion(userId: string) {
  const scheduled = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE users SET status = 'deletion_pending' WHERE id = $1`,
    [userId],
  );
  await pool.query(
    `INSERT INTO deletion_requests (user_id, scheduled_purge_at)
     VALUES ($1, $2)`,
    [userId, scheduled.toISOString()],
  );

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
  await pool.query(
    `UPDATE deletion_requests SET cancelled_at = now()
     WHERE user_id = $1 AND cancelled_at IS NULL`,
    [userId],
  );
  await pool.query(`UPDATE users SET status = 'active' WHERE id = $1`, [userId]);
}

export async function purgeUserAccount(userId: string) {
  await revokeDeviceKeys(userId);
  await pool.query('DELETE FROM messages WHERE sender_user_id = $1', [userId]);
  await pool.query('DELETE FROM media_objects WHERE owner_id = $1', [userId]);
  await pool.query('DELETE FROM profiles WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM device_public_keys WHERE user_id = $1', [userId]);
  await pool.query('DELETE FROM conversation_members WHERE user_id = $1', [userId]);
  await pool.query(`UPDATE users SET status = 'purged' WHERE id = $1`, [userId]);
}

export async function lockAccountPanic(userId: string) {
  await revokeDeviceKeys(userId);
  await pool.query(`UPDATE users SET status = 'locked' WHERE id = $1`, [userId]);
}
