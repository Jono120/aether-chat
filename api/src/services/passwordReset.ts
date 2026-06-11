import { pool, withTransaction } from '../db/pool.js';
import { config } from '../config.js';
import {
  MAX_PASSWORD_LENGTH,
  assertValidNewPassword,
  hashPasswordAsync,
  verifyPasswordAsync,
} from '../utils/password.js';
import {
  PASSWORD_RESET_TOKEN,
  consumeOpaqueToken,
  issueOpaqueToken,
  parseOpaqueToken,
} from '../utils/opaqueToken.js';
import { AuthError } from '../utils/authError.js';
import { sendPasswordResetEmail } from './email.js';
import { logger } from '../utils/logger.js';

const RESET_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT u.id FROM local_accounts la
     JOIN users u ON u.id = la.user_id
     WHERE lower(la.email) = $1 AND u.status = 'active'`,
    [normalized],
  );
  const userId = result.rows[0]?.id;
  if (!userId) {
    return;
  }

  // Invalidate-previous + insert-new commit as one unit; the email send
  // stays outside the transaction.
  const token = await withTransaction((client) =>
    issueOpaqueToken(client, PASSWORD_RESET_TOKEN, userId, RESET_TTL_MS),
  );

  // Token rides in the URL fragment so it never reaches server logs or Referer headers
  const resetUrl = `${config.appPublicUrl.replace(/\/$/, '')}/#reset=${encodeURIComponent(token)}`;
  const emailed = await sendPasswordResetEmail(normalized, resetUrl);

  if (config.devAuthBypass && !emailed) {
    // Dev convenience only: surfaced on the server console, never in API responses
    console.log(`[dev-only] Password reset token: ${token}`);
  } else if (!emailed) {
    logger.warn('Password reset requested but email delivery unavailable');
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  assertValidNewPassword(newPassword);

  if (!parseOpaqueToken(token)) throw new AuthError('Reset link is invalid or has expired');
  const passwordHash = await hashPasswordAsync(newPassword);

  // Token consume + password update commit together so a failure on the
  // second statement can never leave a reusable token.
  const consumed = await withTransaction(async (client) => {
    const result = await consumeOpaqueToken(client, PASSWORD_RESET_TOKEN, token);
    if (!result) return null;
    await client.query('UPDATE local_accounts SET password_hash = $2 WHERE user_id = $1', [
      result.userId,
      passwordHash,
    ]);
    return result;
  });
  if (!consumed) throw new AuthError('Reset link is invalid or has expired');
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  assertValidNewPassword(newPassword);
  if (typeof currentPassword !== 'string' || currentPassword.length > MAX_PASSWORD_LENGTH) {
    // Never feed oversized input to scrypt — its cost scales with input length
    throw new AuthError('Current password is incorrect', 401);
  }

  const result = await pool.query(
    'SELECT password_hash FROM local_accounts WHERE user_id = $1',
    [userId],
  );
  const stored = result.rows[0]?.password_hash;
  if (!stored) {
    throw new AuthError('Password change is only available for email and password accounts');
  }
  if (!(await verifyPasswordAsync(currentPassword, stored))) {
    throw new AuthError('Current password is incorrect', 401);
  }

  await pool.query('UPDATE local_accounts SET password_hash = $2 WHERE user_id = $1', [
    userId,
    await hashPasswordAsync(newPassword),
  ]);
}

export async function verifyAccountPassword(userId: string, password: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }
  const result = await pool.query(
    'SELECT password_hash FROM local_accounts WHERE user_id = $1',
    [userId],
  );
  const stored = result.rows[0]?.password_hash;
  if (!stored) return false;
  return verifyPasswordAsync(password, stored);
}
