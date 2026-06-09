import { pool } from '../db/pool.js';
import { getDiscoveryPreferences } from './discoveryPreferences.js';
import { getPrivacyPreferences } from './privacyPreferences.js';
import { getMyProfile } from './profiles.js';

export type UserDataExport = {
  exportedAt: string;
  formatVersion: 1;
  account: {
    entraOid: string;
    status: string;
    createdAt: string;
    email: string | null;
    oauthProviders: string[];
  };
  profile: Awaited<ReturnType<typeof getMyProfile>>;
  privacyPreferences: Awaited<ReturnType<typeof getPrivacyPreferences>>;
  discoveryPreferences: Awaited<ReturnType<typeof getDiscoveryPreferences>>;
  devicePublicKeys: {
    deviceId: string;
    fingerprint: string;
    publicKeyJwk: unknown;
    createdAt: string;
    revokedAt: string | null;
  }[];
  conversations: {
    id: string;
    isGroup: boolean;
    title: string | null;
    peerEntraOids: string[];
    messages: {
      id: string;
      senderEntraOid: string;
      ciphertext: string;
      cipherSuite: string;
      iv: string;
      keyId: string | null;
      sentAt: string;
      expiresAt: string | null;
    }[];
  }[];
  mediaObjects: {
    id: string;
    blobPath: string;
    contentType: string;
    expiresAt: string;
    createdAt: string;
  }[];
  deletionRequests: {
    scheduledPurgeAt: string;
    cancelledAt: string | null;
    createdAt: string;
  }[];
  notes: string[];
};

export async function exportUserData(userId: string, entraOid: string): Promise<UserDataExport> {
  const userRow = await pool.query(
    `SELECT u.status, u.created_at,
            la.email AS local_email,
            array_agg(DISTINCT oi.provider) FILTER (WHERE oi.provider IS NOT NULL) AS oauth_providers
     FROM users u
     LEFT JOIN local_accounts la ON la.user_id = u.id
     LEFT JOIN oauth_identities oi ON oi.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id, u.status, u.created_at, la.email`,
    [userId],
  );
  const user = userRow.rows[0];
  if (!user) throw new Error('User not found');

  const profile = await getMyProfile(userId, entraOid);
  const privacyPreferences = await getPrivacyPreferences(userId);
  const discoveryPreferences = await getDiscoveryPreferences(userId);

  const keysResult = await pool.query(
    `SELECT device_id, fingerprint, public_key_jwk, created_at, revoked_at
     FROM device_public_keys WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );

  const convResult = await pool.query(
    `SELECT c.id, c.is_group, c.title
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id
     WHERE m.user_id = $1`,
    [userId],
  );

  const conversations = [];
  for (const conv of convResult.rows) {
    const peers = await pool.query(
      `SELECT u.entra_oid FROM conversation_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1 AND m.user_id != $2`,
      [conv.id, userId],
    );
    const messages = await pool.query(
      `SELECT m.id, u.entra_oid AS sender_entra_oid, m.ciphertext, m.cipher_suite, m.iv,
              m.key_id, m.sent_at, m.expires_at
       FROM messages m
       JOIN users u ON u.id = m.sender_user_id
       WHERE m.conversation_id = $1
       ORDER BY m.sent_at ASC`,
      [conv.id],
    );
    conversations.push({
      id: conv.id as string,
      isGroup: Boolean(conv.is_group),
      title: (conv.title as string | null) ?? null,
      peerEntraOids: peers.rows.map((r) => r.entra_oid as string),
      messages: messages.rows.map((row) => ({
        id: row.id as string,
        senderEntraOid: row.sender_entra_oid as string,
        ciphertext: row.ciphertext as string,
        cipherSuite: row.cipher_suite as string,
        iv: row.iv as string,
        keyId: (row.key_id as string | null) ?? null,
        sentAt: (row.sent_at as Date).toISOString(),
        expiresAt: row.expires_at ? (row.expires_at as Date).toISOString() : null,
      })),
    });
  }

  const mediaResult = await pool.query(
    `SELECT id, blob_path, content_type, expires_at, created_at
     FROM media_objects WHERE owner_id = $1 ORDER BY created_at`,
    [userId],
  );

  const deletionResult = await pool.query(
    `SELECT scheduled_purge_at, cancelled_at, created_at
     FROM deletion_requests WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    account: {
      entraOid,
      status: user.status as string,
      createdAt: (user.created_at as Date).toISOString(),
      email: (user.local_email as string | null) ?? null,
      oauthProviders: (user.oauth_providers as string[] | null) ?? [],
    },
    profile,
    privacyPreferences,
    discoveryPreferences,
    devicePublicKeys: keysResult.rows.map((row) => ({
      deviceId: row.device_id as string,
      fingerprint: row.fingerprint as string,
      publicKeyJwk: row.public_key_jwk,
      createdAt: (row.created_at as Date).toISOString(),
      revokedAt: row.revoked_at ? (row.revoked_at as Date).toISOString() : null,
    })),
    conversations,
    mediaObjects: mediaResult.rows.map((row) => ({
      id: row.id as string,
      blobPath: row.blob_path as string,
      contentType: row.content_type as string,
      expiresAt: (row.expires_at as Date).toISOString(),
      createdAt: (row.created_at as Date).toISOString(),
    })),
    deletionRequests: deletionResult.rows.map((row) => ({
      scheduledPurgeAt: (row.scheduled_purge_at as Date).toISOString(),
      cancelledAt: row.cancelled_at ? (row.cancelled_at as Date).toISOString() : null,
      createdAt: (row.created_at as Date).toISOString(),
    })),
    notes: [
      'Message plaintext is end-to-end encrypted; ciphertext is included for portability.',
      'Private keys are stored on your device only — use chat backup export for decrypted history.',
      'Blob media bytes are not included; use blob paths with a separate download flow if needed.',
    ],
  };
}
