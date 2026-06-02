import { pool } from '../db/pool.js';

export async function registerPublicKey(
  userId: string,
  deviceId: string,
  publicKeyJwk: object,
  fingerprint: string,
) {
  await pool.query(
    `INSERT INTO device_public_keys (user_id, device_id, public_key_jwk, fingerprint)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, device_id) DO UPDATE SET
       public_key_jwk = EXCLUDED.public_key_jwk,
       fingerprint = EXCLUDED.fingerprint,
       revoked_at = NULL,
       created_at = now()`,
    [userId, deviceId, JSON.stringify(publicKeyJwk), fingerprint],
  );
}

export async function revokeDeviceKeys(userId: string, deviceId?: string) {
  if (deviceId) {
    await pool.query(
      `UPDATE device_public_keys SET revoked_at = now()
       WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
      [userId, deviceId],
    );
  } else {
    await pool.query(
      `UPDATE device_public_keys SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }
}

export async function getActivePublicKeysForUser(entraOid: string) {
  const result = await pool.query(
    `SELECT k.device_id, k.public_key_jwk, k.fingerprint, k.created_at
     FROM device_public_keys k
     JOIN users u ON u.id = k.user_id
     WHERE u.entra_oid = $1 AND k.revoked_at IS NULL
     ORDER BY k.created_at DESC`,
    [entraOid],
  );
  return result.rows;
}
