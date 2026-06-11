import { pool, withTransaction } from '../db/pool.js';
import { config } from '../config.js';
import { AuthError } from '../utils/authError.js';
import {
  EMAIL_VERIFICATION_TOKEN,
  consumeOpaqueToken,
  issueOpaqueToken,
  parseOpaqueToken,
} from '../utils/opaqueToken.js';
import { sendVerificationEmail } from './email.js';
import { logger } from '../utils/logger.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export async function requestEmailVerification(userId: string, email: string): Promise<void> {
  // Invalidate-previous + insert-new commit as one unit; the email send
  // stays outside the transaction.
  const token = await withTransaction((client) =>
    issueOpaqueToken(client, EMAIL_VERIFICATION_TOKEN, userId, VERIFY_TTL_MS),
  );

  // Token rides in the URL fragment so it never reaches server logs or Referer headers
  const verifyUrl = `${config.appPublicUrl.replace(/\/$/, '')}/#verify-email=${encodeURIComponent(token)}`;
  const emailed = await sendVerificationEmail(email, verifyUrl);

  if (config.devAuthBypass && !emailed) {
    // Dev convenience only: surfaced on the server console, never in API responses
    console.log(`[dev-only] Email verification token: ${token}`);
  } else if (!emailed) {
    logger.warn('Email verification requested but email delivery unavailable');
  }
}

export async function verifyEmailWithToken(token: string): Promise<void> {
  if (!parseOpaqueToken(token)) {
    throw new AuthError('Verification link is invalid or has expired');
  }

  // Token consume + verified-at update commit together so a failure on the
  // second statement can never leave a reusable token.
  const consumed = await withTransaction(async (client) => {
    const result = await consumeOpaqueToken(client, EMAIL_VERIFICATION_TOKEN, token);
    if (!result) return null;
    await client.query(
      `UPDATE local_accounts SET email_verified_at = COALESCE(email_verified_at, now())
       WHERE user_id = $1`,
      [result.userId],
    );
    return result;
  });
  if (!consumed) throw new AuthError('Verification link is invalid or has expired');
}

export async function resendEmailVerification(
  userId: string,
): Promise<{ alreadyVerified: boolean }> {
  const result = await pool.query(
    'SELECT email, email_verified_at FROM local_accounts WHERE user_id = $1',
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new AuthError('Email verification is only available for email and password accounts');
  }
  if (row.email_verified_at) {
    return { alreadyVerified: true };
  }
  await requestEmailVerification(userId, row.email);
  return { alreadyVerified: false };
}
