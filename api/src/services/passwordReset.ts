import { randomBytes } from 'node:crypto';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { hashPassword, hashToken, verifyPassword } from '../utils/password.js';
import { sendPasswordResetEmail } from './email.js';

const RESET_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(email: string): Promise<{ devToken?: string }> {
  const normalized = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT u.id FROM local_accounts la
     JOIN users u ON u.id = la.user_id
     WHERE lower(la.email) = $1 AND u.status = 'active'`,
    [normalized],
  );
  const userId = result.rows[0]?.id;
  if (!userId) {
    return {};
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await pool.query(
    `UPDATE password_reset_tokens SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  );

  const resetUrl = `${config.appPublicUrl.replace(/\/$/, '')}/?reset=${encodeURIComponent(token)}`;
  const emailed = await sendPasswordResetEmail(normalized, resetUrl);

  if (config.devAuthBypass && !emailed) {
    return { devToken: token };
  }
  return {};
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const tokenHash = hashToken(token);
  const row = await pool.query(
    `SELECT prt.user_id
     FROM password_reset_tokens prt
     WHERE prt.token_hash = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > now()`,
    [tokenHash],
  );
  const userId = row.rows[0]?.user_id;
  if (!userId) throw new Error('Reset link is invalid or has expired');

  await pool.query('UPDATE local_accounts SET password_hash = $2 WHERE user_id = $1', [
    userId,
    hashPassword(newPassword),
  ]);
  await pool.query(
    'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
    [userId],
  );
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const result = await pool.query(
    'SELECT password_hash FROM local_accounts WHERE user_id = $1',
    [userId],
  );
  const stored = result.rows[0]?.password_hash;
  if (!stored) {
    throw new Error('Password change is only available for email and password accounts');
  }
  if (!verifyPassword(currentPassword, stored)) {
    throw new Error('Current password is incorrect');
  }

  await pool.query('UPDATE local_accounts SET password_hash = $2 WHERE user_id = $1', [
    userId,
    hashPassword(newPassword),
  ]);
}

export async function verifyAccountPassword(userId: string, password: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT password_hash FROM local_accounts WHERE user_id = $1',
    [userId],
  );
  const stored = result.rows[0]?.password_hash;
  if (!stored) return false;
  return verifyPassword(password, stored);
}
