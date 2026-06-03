import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { verifySessionToken } from '../services/auth.js';
import { logger } from '../utils/logger.js';

export type AuthUser = {
  id: string;
  entraOid: string;
  isAdmin: boolean;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      requestId?: string;
    }
  }
}

const jwks = config.azureAdTenantId
  ? jwksClient({
      jwksUri: `https://login.microsoftonline.com/${config.azureAdTenantId}/discovery/v2.0/keys`,
      cache: true,
      rateLimit: true,
    })
  : null;

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!jwks || !header.kid) return reject(new Error('JWKS unavailable'));
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error('No signing key'));
      resolve(key.getPublicKey());
    });
  });
}

async function verifyEntraToken(token: string): Promise<jwt.JwtPayload> {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header) {
    throw new Error('Invalid token');
  }
  const key = await getSigningKey(decoded.header);
  return jwt.verify(token, key, {
    audience: config.azureAdClientId,
    issuer: `https://login.microsoftonline.com/${config.azureAdTenantId}/v2.0`,
    algorithms: ['RS256'],
  }) as jwt.JwtPayload;
}

async function resolveUser(entraOid: string): Promise<AuthUser> {
  const existing = await pool.query(
    'SELECT id, entra_oid, is_admin FROM users WHERE entra_oid = $1',
    [entraOid],
  );
  if (existing.rows[0]) {
    return {
      id: existing.rows[0].id,
      entraOid: existing.rows[0].entra_oid,
      isAdmin: Boolean(existing.rows[0].is_admin),
    };
  }
  const inserted = await pool.query(
    'INSERT INTO users (entra_oid, is_admin) VALUES ($1, false) RETURNING id, entra_oid, is_admin',
    [entraOid],
  );
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    inserted.rows[0].id,
  ]);
  return {
    id: inserted.rows[0].id,
    entraOid: inserted.rows[0].entra_oid,
    isAdmin: Boolean(inserted.rows[0].is_admin),
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (config.devAuthBypass && req.header('x-dev-user-id')) {
      const devId = req.header('x-dev-user-id')!;
      const user = await resolveUser(devId);
      req.authUser = { ...user, isAdmin: true };
      return next();
    }

    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    const token = header.slice(7);

    if (config.azureAdTenantId && config.azureAdClientId) {
      const payload = await verifyEntraToken(token);
      const oid = (payload.oid ?? payload.sub) as string;
      req.authUser = await resolveUser(oid);
      return next();
    }

    if (config.jwtSecret) {
      try {
        const sub = verifySessionToken(token);
        req.authUser = await resolveUser(sub);
        return next();
      } catch {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
    }

    return res.status(401).json({ error: 'Auth not configured' });
  } catch (err) {
    logger.warn('Auth verification failed', {
      requestId: req.requestId,
      error: err instanceof Error ? err.name : 'AuthError',
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
