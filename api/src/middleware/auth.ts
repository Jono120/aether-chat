import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

export type AuthUser = {
  id: string;
  entraOid: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
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
  const existing = await pool.query('SELECT id, entra_oid FROM users WHERE entra_oid = $1', [entraOid]);
  if (existing.rows[0]) {
    return { id: existing.rows[0].id, entraOid: existing.rows[0].entra_oid };
  }
  const inserted = await pool.query(
    'INSERT INTO users (entra_oid) VALUES ($1) RETURNING id, entra_oid',
    [entraOid],
  );
  await pool.query('INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [
    inserted.rows[0].id,
  ]);
  return { id: inserted.rows[0].id, entraOid: inserted.rows[0].entra_oid };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (config.devAuthBypass && req.header('x-dev-user-id')) {
      const devId = req.header('x-dev-user-id')!;
      req.authUser = await resolveUser(devId);
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

    if (config.devAuthBypass) {
      const payload = jwt.decode(token) as { sub?: string } | null;
      const sub = payload?.sub ?? 'dev-anonymous';
      req.authUser = await resolveUser(sub);
      return next();
    }

    return res.status(401).json({ error: 'Auth not configured' });
  } catch (err) {
    console.error('Auth error', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
