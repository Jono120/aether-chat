import { pool } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

export type MessageEnvelope = {
  ciphertext: string;
  cipherSuite: string;
  iv: string;
  keyId?: string;
  expiresAt?: string | null;
};

export async function ensureDirectConversation(userId: string, peerEntraOid: string): Promise<string> {
  const peer = await pool.query('SELECT id FROM users WHERE entra_oid = $1', [peerEntraOid]);
  if (!peer.rows[0]) throw new Error('Peer not found');

  const existing = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = $2
     WHERE c.is_group = false`,
    [userId, peer.rows[0].id],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const convId = uuidv4();
  await pool.query('INSERT INTO conversations (id, is_group) VALUES ($1, false)', [convId]);
  await pool.query(
    'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
    [convId, userId, peer.rows[0].id],
  );
  return convId;
}

export async function listConversations(userId: string) {
  const result = await pool.query(
    `SELECT c.id, c.is_group, c.title,
       array_agg(u.entra_oid) FILTER (WHERE u.id != $1) AS peer_ids
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id
     JOIN users u ON u.id = m.user_id
     WHERE c.id IN (SELECT conversation_id FROM conversation_members WHERE user_id = $1)
     GROUP BY c.id`,
    [userId],
  );
  return result.rows;
}

export async function listMessages(conversationId: string, userId: string, limit = 50) {
  const member = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId],
  );
  if (!member.rowCount) throw new Error('Forbidden');

  const result = await pool.query(
    `SELECT m.id, m.ciphertext, m.cipher_suite, m.iv, m.key_id, m.sent_at, m.expires_at,
            u.entra_oid AS sender_entra_oid
     FROM messages m
     JOIN users u ON u.id = m.sender_user_id
     WHERE m.conversation_id = $1
       AND (m.expires_at IS NULL OR m.expires_at > now())
     ORDER BY m.sent_at ASC
     LIMIT $2`,
    [conversationId, limit],
  );
  return result.rows;
}

export async function insertMessage(
  conversationId: string,
  senderUserId: string,
  envelope: MessageEnvelope,
) {
  const member = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, senderUserId],
  );
  if (!member.rowCount) throw new Error('Forbidden');

  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_user_id, ciphertext, cipher_suite, iv, key_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, sent_at`,
    [
      conversationId,
      senderUserId,
      envelope.ciphertext,
      envelope.cipherSuite,
      envelope.iv,
      envelope.keyId ?? null,
      envelope.expiresAt ?? null,
    ],
  );
  return result.rows[0];
}

export async function purgeExpiredMessages() {
  await pool.query('DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= now()');
}
