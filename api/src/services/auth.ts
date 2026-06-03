import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from '../utils/password.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { ensureProfileForUser } from './profiles.js';
import { verifyAppleIdToken, verifyGoogleCredential, type OAuthProfile } from './oauthProviders.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthSession = {
  token: string;
  user: { id: string; email: string; displayName: string; isAdmin: boolean };
};

export type AuthPublicConfig = {
  google: 'enabled' | 'mock' | 'disabled';
  apple: 'enabled' | 'mock' | 'disabled';
  googleClientId: string | null;
  appleClientId: string | null;
  appleRedirectUri: string;
};

function signSessionToken(entraOid: string): string {
  return jwt.sign({ sub: entraOid }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
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
  if (entraOid === config.adminEntraOid || entraOid === 'dev-user-1') {
    return true;
  }
  if (email && email.toLowerCase() === config.adminEmail.toLowerCase()) {
    return true;
  }
  const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return Boolean(result.rows[0]?.is_admin);
}

async function buildAuthSession(
  userId: string,
  entraOid: string,
  email: string,
  displayName: string,
): Promise<AuthSession> {
  const isAdmin = await userIsAdmin(userId, entraOid, email);
  return {
    token: signSessionToken(entraOid),
    user: { id: entraOid, email, displayName, isAdmin },
  };
}

async function findOrCreateOAuthUser(profile: OAuthProfile): Promise<AuthSession> {
  const linked = await pool.query(
    `SELECT u.id, u.entra_oid, p.display_name, oi.email
     FROM oauth_identities oi
     JOIN users u ON u.id = oi.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE oi.provider = $1 AND oi.provider_subject = $2`,
    [profile.provider, profile.subject],
  );

  if (linked.rows[0]) {
    const row = linked.rows[0];
    return buildAuthSession(
      row.id,
      row.entra_oid,
      row.email ?? profile.email ?? `${profile.provider}@users.aether`,
      row.display_name,
    );
  }

  const entraOid = `${profile.provider}:${profile.subject}`;
  const email = profile.email ?? `${profile.subject}@${profile.provider}.users.aether`;

  const user = await pool.query(
    `INSERT INTO users (entra_oid, is_admin) VALUES ($1, false) RETURNING id`,
    [entraOid],
  );
  const userId = user.rows[0].id;

  await pool.query(
    `INSERT INTO oauth_identities (user_id, provider, provider_subject, email)
     VALUES ($1, $2, $3, $4)`,
    [userId, profile.provider, profile.subject, profile.email],
  );
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    userId,
  ]);
  await ensureProfileForUser(userId, entraOid);
  await pool.query(
    `UPDATE profiles SET display_name = $2, updated_at = now() WHERE user_id = $1`,
    [userId, profile.displayName],
  );

  return buildAuthSession(userId, entraOid, email, profile.displayName);
}

export async function registerLocalAccount(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthSession> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    throw new Error('Enter a valid email address');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (normalized === config.adminEmail.toLowerCase()) {
    throw new Error('This email is already in use');
  }

  const name = displayName.trim() || normalized.split('@')[0];
  const entraOid = `local:${uuidv4()}`;

  const existing = await pool.query('SELECT 1 FROM local_accounts WHERE lower(email) = $1', [
    normalized,
  ]);
  if (existing.rows[0]) {
    throw new Error('An account with this email already exists');
  }

  const user = await pool.query(
    'INSERT INTO users (entra_oid, is_admin) VALUES ($1, false) RETURNING id, entra_oid',
    [entraOid],
  );
  const userId = user.rows[0].id;

  await pool.query(
    'INSERT INTO local_accounts (user_id, email, password_hash) VALUES ($1, $2, $3)',
    [userId, normalized, hashPassword(password)],
  );
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    userId,
  ]);
  await ensureProfileForUser(userId, entraOid);
  await pool.query(
    `UPDATE profiles SET display_name = $2, updated_at = now() WHERE user_id = $1`,
    [userId, name],
  );

  return buildAuthSession(userId, entraOid, normalized, name);
}

export async function loginLocalAccount(email: string, password: string): Promise<AuthSession> {
  const normalized = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT u.id, u.entra_oid, la.email, la.password_hash, p.display_name
     FROM local_accounts la
     JOIN users u ON u.id = la.user_id
     JOIN profiles p ON p.user_id = u.id
     WHERE lower(la.email) = $1 AND u.status = 'active'`,
    [normalized],
  );
  const row = result.rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error('Email or password is incorrect');
  }

  return buildAuthSession(row.id, row.entra_oid, row.email, row.display_name);
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
    throw new Error('Demo sign-in is only available in development');
  }
  return findOrCreateOAuthUser({
    provider,
    subject: `demo-${randomBytes(6).toString('hex')}`,
    email: `demo.${provider}@aether.local`,
    displayName: provider === 'google' ? 'Google Demo' : 'Apple Demo',
  });
}

export function verifySessionToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
  if (!payload.sub) throw new Error('Invalid token');
  return payload.sub;
}

export async function getSessionUser(entraOid: string): Promise<AuthSession['user'] | null> {
  const result = await pool.query(
    `SELECT u.id, u.entra_oid, p.display_name,
            COALESCE(la.email, oi.email, $2) AS email
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
  };
}
