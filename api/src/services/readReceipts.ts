import { pool } from '../db/pool.js';

export async function assertConversationMember(conversationId: string, userId: string) {
  const member = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId],
  );
  if (!member.rowCount) throw new Error('Forbidden');
}

export async function markMessagesRead(
  conversationId: string,
  readerUserId: string,
  messageIds: string[],
): Promise<{ marked: number }> {
  await assertConversationMember(conversationId, readerUserId);
  if (!messageIds.length) return { marked: 0 };

  const prefs = await pool.query(
    'SELECT read_receipts_enabled FROM user_preferences WHERE user_id = $1',
    [readerUserId],
  );
  if (!prefs.rows[0]?.read_receipts_enabled) {
    return { marked: 0 };
  }

  const result = await pool.query(
    `INSERT INTO message_receipts (message_id, user_id)
     SELECT m.id, $2
     FROM messages m
     WHERE m.conversation_id = $1
       AND m.id = ANY($3::uuid[])
       AND m.sender_user_id != $2
     ON CONFLICT (message_id, user_id) DO NOTHING`,
    [conversationId, readerUserId, messageIds],
  );
  return { marked: result.rowCount ?? 0 };
}

export async function getReadReceiptsForConversation(
  conversationId: string,
  viewerUserId: string,
): Promise<Record<string, { entraOid: string; readAt: string }[]>> {
  const result = await pool.query(
    `SELECT mr.message_id, mr.read_at, u.entra_oid
     FROM message_receipts mr
     JOIN messages m ON m.id = mr.message_id
     JOIN users u ON u.id = mr.user_id
     WHERE m.conversation_id = $1
       AND m.sender_user_id = $2
       AND mr.user_id != $2`,
    [conversationId, viewerUserId],
  );

  const map: Record<string, { entraOid: string; readAt: string }[]> = {};
  for (const row of result.rows) {
    const mid = row.message_id as string;
    if (!map[mid]) map[mid] = [];
    map[mid].push({
      entraOid: row.entra_oid as string,
      readAt: (row.read_at as Date).toISOString(),
    });
  }
  return map;
}

export async function setReadReceiptsPreference(userId: string, enabled: boolean) {
  await pool.query(
    `INSERT INTO user_preferences (user_id, read_receipts_enabled)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET read_receipts_enabled = EXCLUDED.read_receipts_enabled`,
    [userId, enabled],
  );
}

export async function getReadReceiptsPreference(userId: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT read_receipts_enabled FROM user_preferences WHERE user_id = $1',
    [userId],
  );
  return Boolean(result.rows[0]?.read_receipts_enabled);
}
