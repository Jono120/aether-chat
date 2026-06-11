import { randomBytes } from 'node:crypto';
import type { Queryable } from '../db/pool.js';
import { hashPassword, verifyPassword } from './password.js';

/**
 * Shared `<rowId>.<secret>` opaque-token pattern backing refresh, password
 * reset, and email verification tokens. The row id locates the record and
 * the secret is stored only as a salted scrypt hash (random per-token salt),
 * so a DB leak cannot be replayed.
 */
export type OpaqueTokenKind = {
  table: 'session_refresh_tokens' | 'password_reset_tokens' | 'email_verification_tokens';
  /** Column that marks a token unusable. */
  invalidatedColumn: 'used_at' | 'revoked_at';
  /** Whether issuing a new token invalidates the user's outstanding ones. */
  invalidatePreviousOnIssue: boolean;
};

export const SESSION_REFRESH_TOKEN: OpaqueTokenKind = {
  table: 'session_refresh_tokens',
  invalidatedColumn: 'revoked_at',
  // A user may hold several live sessions (one refresh token each)
  invalidatePreviousOnIssue: false,
};

export const PASSWORD_RESET_TOKEN: OpaqueTokenKind = {
  table: 'password_reset_tokens',
  invalidatedColumn: 'used_at',
  invalidatePreviousOnIssue: true,
};

export const EMAIL_VERIFICATION_TOKEN: OpaqueTokenKind = {
  table: 'email_verification_tokens',
  invalidatedColumn: 'used_at',
  invalidatePreviousOnIssue: true,
};

const TOKEN_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{64})$/i;

export function parseOpaqueToken(token: unknown): { id: string; secret: string } | null {
  if (typeof token !== 'string') return null;
  const match = token.match(TOKEN_RE);
  if (!match) return null;
  return { id: match[1], secret: match[2] };
}

/**
 * Issues a new token, optionally invalidating the user's outstanding ones
 * first (per `kind`). Pass a transaction client so invalidate + insert commit
 * as one unit.
 */
export async function issueOpaqueToken(
  db: Queryable,
  kind: OpaqueTokenKind,
  userId: string,
  ttlMs: number,
): Promise<string> {
  const secret = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs);

  if (kind.invalidatePreviousOnIssue) {
    await db.query(
      `UPDATE ${kind.table} SET ${kind.invalidatedColumn} = now()
       WHERE user_id = $1 AND ${kind.invalidatedColumn} IS NULL`,
      [userId],
    );
  }

  const inserted = await db.query(
    `INSERT INTO ${kind.table} (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, hashPassword(secret), expiresAt.toISOString()],
  );
  return `${inserted.rows[0].id}.${secret}`;
}

/**
 * Looks up an unused, unexpired token, verifies the secret against the
 * stored hash, and marks all the user's outstanding tokens used. Returns
 * null when the token is invalid in any way. Run inside a transaction
 * together with the state change the token guards, so a failure on either
 * statement can never leave a reusable token.
 */
export async function consumeOpaqueToken(
  db: Queryable,
  kind: OpaqueTokenKind,
  token: string,
): Promise<{ userId: string } | null> {
  const parsed = parseOpaqueToken(token);
  if (!parsed) return null;

  const result = await db.query(
    `SELECT user_id, token_hash FROM ${kind.table}
     WHERE id = $1
       AND ${kind.invalidatedColumn} IS NULL
       AND expires_at > now()`,
    [parsed.id],
  );
  const record = result.rows[0];
  if (!record || !verifyPassword(parsed.secret, record.token_hash)) {
    return null;
  }

  await db.query(
    `UPDATE ${kind.table} SET ${kind.invalidatedColumn} = now()
     WHERE user_id = $1 AND ${kind.invalidatedColumn} IS NULL`,
    [record.user_id],
  );
  return { userId: record.user_id as string };
}
