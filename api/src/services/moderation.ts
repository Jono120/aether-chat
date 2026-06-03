import { pool } from '../db/pool.js';

async function resolveUserId(entraOid: string): Promise<string | null> {
  const result = await pool.query('SELECT id FROM users WHERE entra_oid = $1', [entraOid]);
  return result.rows[0]?.id ?? null;
}

export async function blockUser(blockerUserId: string, peerEntraOid: string) {
  const blockedId = await resolveUserId(peerEntraOid);
  if (!blockedId) throw new Error('User not found');
  if (blockedId === blockerUserId) throw new Error('Cannot block yourself');

  await pool.query(
    `INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [blockerUserId, blockedId],
  );
}

export async function unblockUser(blockerUserId: string, peerEntraOid: string) {
  const blockedId = await resolveUserId(peerEntraOid);
  if (!blockedId) return;
  await pool.query(
    'DELETE FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2',
    [blockerUserId, blockedId],
  );
}

export async function listBlockedEntraOids(userId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT u.entra_oid
     FROM user_blocks b
     JOIN users u ON u.id = b.blocked_user_id
     WHERE b.blocker_user_id = $1`,
    [userId],
  );
  return result.rows.map((r) => r.entra_oid as string);
}

export async function isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
        OR (blocker_user_id = $2 AND blocked_user_id = $1)`,
    [userA, userB],
  );
  return Boolean(result.rowCount);
}

export async function reportUser(
  reporterUserId: string,
  peerEntraOid: string,
  reason: string,
  details: string,
  conversationId?: string | null,
) {
  const reportedId = await resolveUserId(peerEntraOid);
  if (!reportedId) throw new Error('User not found');
  if (reportedId === reporterUserId) throw new Error('Cannot report yourself');

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) throw new Error('Please select or enter a reason');

  await pool.query(
    `INSERT INTO user_reports (reporter_user_id, reported_user_id, conversation_id, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [reporterUserId, reportedId, conversationId ?? null, trimmedReason, details.trim().slice(0, 2000)],
  );
}
