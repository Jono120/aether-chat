import { randomBytes } from 'node:crypto';
import {
  DUMMY_PASSWORD_HASH,
  MAX_PASSWORD_LENGTH,
  assertValidNewPassword,
  hashPasswordAsync,
  verifyPassword,
  verifyPasswordAsync,
} from '../utils/password.js';
import {
  SESSION_REFRESH_TOKEN,
  issueOpaqueToken,
  parseOpaqueToken,
} from '../utils/opaqueToken.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { pool, withTransaction } from '../db/pool.js';
import { AuthError } from '../utils/authError.js';
import { provisionUser } from './userProvisioning.js';
import { requestEmailVerification } from './emailVerification.js';
import { verifyAppleIdToken, verifyGoogleCredential, type OAuthProfile } from './oauthProviders.js';
import { logger } from '../utils/logger.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthSession = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    emailVerified: boolean;
  };
};

export type AuthPublicConfig = {
  google: 'enabled' | 'mock' | 'disabled';
  apple: 'enabled' | 'mock' | 'disabled';
  googleClientId: string | null;
  appleClientId: string | null;
  appleRedirectUri: string;
};

/** Postgres unique-constraint violation (e.g. concurrent insert on a unique index). */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505'
  );
}

function signSessionToken(entraOid: string): string {
  return jwt.sign({ sub: entraOid }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function refreshTokenTtlMs(): number {
  return config.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
}

/**
 * Opaque rotating refresh token in the shared `<rowId>.<secret>` format
 * (see utils/opaqueToken.ts). Only a salted scrypt hash of the secret is
 * stored, so a DB leak cannot be replayed as a session.
 */
function issueRefreshToken(userId: string): Promise<string> {
  return issueOpaqueToken(pool, SESSION_REFRESH_TOKEN, userId, refreshTokenTtlMs());
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const parsed = parseOpaqueToken(refreshToken);
  if (!parsed) throw new AuthError('Invalid refresh token', 401);

  const result = await pool.query(
    `SELECT rt.id, rt.user_id, rt.token_hash, rt.revoked_at,
            (rt.expires_at > now()) AS not_expired,
            u.entra_oid, u.status
     FROM session_refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.id = $1`,
    [parsed.id],
  );
  const row = result.rows[0];
  if (!row || !verifyPassword(parsed.secret, row.token_hash)) {
    throw new AuthError('Invalid refresh token', 401);
  }
  if (row.revoked_at) {
    // A rotated/revoked token was replayed with its correct secret — treat it
    // as theft and invalidate the whole token family for this user.
    await pool.query(
      `UPDATE session_refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id],
    );
    logger.warn('Refresh token reuse detected; revoked all active refresh tokens for user');
    throw new AuthError('Invalid refresh token', 401);
  }
  if (!row.not_expired) {
    throw new AuthError('Invalid refresh token', 401);
  }
  if (row.status !== 'active' && row.status !== 'deletion_pending') {
    throw new AuthError('Account is not active', 403);
  }

  const sessionUser = await getSessionUser(row.entra_oid);
  if (!sessionUser) throw new AuthError('Invalid refresh token', 401);

  // Rotation is atomic: the new token insert and old-token revoke commit
  // together, so a crash in between can't leave two live refresh tokens.
  const nextRefreshToken = await withTransaction(async (client) => {
    const next = await issueOpaqueToken(client, SESSION_REFRESH_TOKEN, row.user_id, refreshTokenTtlMs());
    await client.query(
      `UPDATE session_refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1`,
      [row.id, next.split('.')[0]],
    );
    return next;
  });

  return {
    token: signSessionToken(row.entra_oid),
    refreshToken: nextRefreshToken,
    user: sessionUser,
  };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const parsed = parseOpaqueToken(refreshToken);
  if (!parsed) return;
  await pool.query(
    `UPDATE session_refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
    [parsed.id],
  );
}

export function getAuthPublicConfig(): AuthPublicConfig {
  return {
    google: config.googleClientId
      ? 'enabled'
      : config.devAuthBypass
        ? 'mock'
        : 'disabled',
    apple: config.appleClientId ? 'enabled' : config.devAuthBypass ? 'mock' : 'disabled',
    googleClientId: config.googleClientId || null,
    appleClientId: config.appleClientId || null,
    appleRedirectUri: config.appleRedirectUri || config.corsOrigin,
  };
}

async function userIsAdmin(
  userId: string,
  entraOid: string,
  email?: string | null,
): Promise<boolean> {
  if (config.devAuthBypass) {
    if (entraOid === config.adminEntraOid || entraOid === 'dev-user-1') {
      return true;
    }
    if (email && email.toLowerCase() === config.adminEmail.toLowerCase()) {
      return true;
    }
  }
  const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return Boolean(result.rows[0]?.is_admin);
}

async function buildAuthSession(
  userId: string,
  entraOid: string,
  email: string,
  displayName: string,
  emailVerified: boolean,
): Promise<AuthSession> {
  const isAdmin = await userIsAdmin(userId, entraOid, email);
  return {
    token: signSessionToken(entraOid),
    refreshToken: await issueRefreshToken(userId),
    user: { id: entraOid, email, displayName, isAdmin, emailVerified },
  };
}

async function findLinkedOAuthSession(profile: OAuthProfile): Promise<AuthSession | null> {
  const linked = await pool.query(
    `SELECT u.id, u.entra_oid, p.display_name, oi.email
     FROM oauth_identities oi
     JOIN users u ON u.id = oi.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE oi.provider = $1 AND oi.provider_subject = $2`,
    [profile.provider, profile.subject],
  );
  const row = linked.rows[0];
  if (!row) return null;
  // OAuth emails count as verified by the provider
  return buildAuthSession(
    row.id,
    row.entra_oid,
    row.email ?? profile.email ?? `${profile.provider}@users.aether`,
    row.display_name,
    true,
  );
}

async function findOrCreateOAuthUser(profile: OAuthProfile): Promise<AuthSession> {
  const existing = await findLinkedOAuthSession(profile);
  if (existing) return existing;

  const entraOid = `${profile.provider}:${profile.subject}`;
  const email = profile.email ?? `${profile.subject}@${profile.provider}.users.aether`;

  let userId: string;
  try {
    // All first sign-in writes commit together so a mid-flow failure can
    // never leave an orphaned users row without an identity or profile.
    userId = await withTransaction(async (client) => {
      const user = await provisionUser(client, { entraOid, displayName: profile.displayName });
      await client.query(
        `INSERT INTO oauth_identities (user_id, provider, provider_subject, email)
         VALUES ($1, $2, $3, $4)`,
        [user.id, profile.provider, profile.subject, profile.email],
      );
      return user.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // A concurrent first sign-in created this identity — log in to it instead
      const winner = await findLinkedOAuthSession(profile);
      if (winner) return winner;
    }
    throw err;
  }

  return buildAuthSession(userId, entraOid, email, profile.displayName, true);
}

export async function registerLocalAccount(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthSession> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    throw new AuthError('Enter a valid email address');
  }
  assertValidNewPassword(password);
  if (normalized === config.adminEmail.toLowerCase()) {
    throw new AuthError('An account with this email already exists', 409);
  }

  const name = displayName.trim() || normalized.split('@')[0];
  const entraOid = `local:${uuidv4()}`;
  const passwordHash = await hashPasswordAsync(password);

  // All sign-up writes run in one transaction so a mid-flow failure can never
  // leave an orphaned users row without credentials or a profile.
  let userId: string;
  try {
    userId = await withTransaction(async (client) => {
      const user = await provisionUser(client, { entraOid, displayName: name });
      await client.query(
        'INSERT INTO local_accounts (user_id, email, password_hash) VALUES ($1, $2, $3)',
        [user.id, normalized, passwordHash],
      );
      return user.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Concurrent registration hit the unique email index first
      throw new AuthError('An account with this email already exists', 409);
    }
    throw err;
  }

  try {
    await requestEmailVerification(userId, normalized);
  } catch (err) {
    // Verification email failures must not block account creation
    logger.warn('Verification email send failed after registration', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return buildAuthSession(userId, entraOid, normalized, name, false);
}

export async function loginLocalAccount(email: string, password: string): Promise<AuthSession> {
  if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
    // Never feed oversized input to scrypt — its cost scales with input length
    throw new AuthError('Email or password is incorrect', 401);
  }
  const normalized = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT u.id, u.entra_oid, u.status, la.email, la.password_hash, la.email_verified_at,
            p.display_name
     FROM local_accounts la
     JOIN users u ON u.id = la.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE lower(la.email) = $1`,
    [normalized],
  );
  const row = result.rows[0];
  // Always run scrypt (against a dummy hash when the email is unknown) so
  // response timing cannot be used to enumerate accounts.
  const valid = await verifyPasswordAsync(password, row?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!row || !valid) {
    throw new AuthError('Email or password is incorrect', 401);
  }
  if (row.status === 'locked') {
    throw new AuthError('Account locked', 403);
  }
  // deletion_pending may sign in during the grace period (to cancel deletion);
  // anything else (e.g. purged) stays out.
  if (row.status !== 'active' && row.status !== 'deletion_pending') {
    throw new AuthError('Email or password is incorrect', 401);
  }

  return buildAuthSession(
    row.id,
    row.entra_oid,
    row.email,
    row.display_name,
    Boolean(row.email_verified_at),
  );
}

export async function loginWithGoogle(credential: string): Promise<AuthSession> {
  const profile = await verifyGoogleCredential(credential);
  return findOrCreateOAuthUser(profile);
}

export async function loginWithApple(
  idToken: string,
  displayName?: string,
): Promise<AuthSession> {
  const profile = await verifyAppleIdToken(idToken, displayName);
  return findOrCreateOAuthUser(profile);
}

export async function mockOAuthLogin(provider: 'google' | 'apple'): Promise<AuthSession> {
  if (!config.devAuthBypass) {
    throw new AuthError('Demo sign-in is only available in development', 403);
  }
  return findOrCreateOAuthUser({
    provider,
    subject: `demo-${randomBytes(6).toString('hex')}`,
    email: `demo.${provider}@aether.local`,
    displayName: provider === 'google' ? 'Google Demo' : 'Apple Demo',
  });
}

export function verifySessionToken(token: string): string {
  // Pin the algorithm so an attacker-supplied header can't downgrade verification
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as {
    sub?: string;
  };
  if (!payload.sub) throw new Error('Invalid token');
  return payload.sub;
}

export async function getSessionUser(entraOid: string): Promise<AuthSession['user'] | null> {
  const result = await pool.query(
    `SELECT u.id, u.entra_oid, p.display_name,
            COALESCE(la.email, oi.email, $2) AS email,
            (la.user_id IS NULL OR la.email_verified_at IS NOT NULL) AS email_verified
     FROM users u
     JOIN profiles p ON p.user_id = u.id
     LEFT JOIN local_accounts la ON la.user_id = u.id
     LEFT JOIN oauth_identities oi ON oi.user_id = u.id
     WHERE u.entra_oid = $1
     LIMIT 1`,
    [entraOid, `${entraOid}@users.aether`],
  );
  const row = result.rows[0];
  if (!row) return null;
  const isAdmin = await userIsAdmin(row.id, row.entra_oid, row.email);
  return {
    id: row.entra_oid,
    email: row.email,
    displayName: row.display_name,
    isAdmin,
    emailVerified: Boolean(row.email_verified),
  };
}
