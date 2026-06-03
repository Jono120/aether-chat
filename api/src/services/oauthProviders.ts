import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config.js';

export type OAuthProfile = {
  provider: 'google' | 'apple';
  subject: string;
  email: string | null;
  displayName: string;
};

const appleJwks = config.appleClientId
  ? jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true,
    })
  : null;

function appleSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!appleJwks || !header.kid) return reject(new Error('Apple JWKS unavailable'));
    appleJwks.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error('No Apple signing key'));
      resolve(key.getPublicKey());
    });
  });
}

export async function verifyGoogleCredential(credential: string): Promise<OAuthProfile> {
  if (!config.googleClientId) {
    throw new Error('Google sign-in is not configured');
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!res.ok) {
    throw new Error('Google sign-in could not be verified');
  }

  const data = (await res.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: string;
  };

  if (data.aud !== config.googleClientId || !data.sub) {
    throw new Error('Google sign-in could not be verified');
  }

  if (data.email_verified === 'false') {
    throw new Error('Google email is not verified');
  }

  return {
    provider: 'google',
    subject: data.sub,
    email: data.email?.toLowerCase() ?? null,
    displayName: data.name?.trim() || data.email?.split('@')[0] || 'Google user',
  };
}

export async function verifyAppleIdToken(
  idToken: string,
  nameFromClient?: string,
): Promise<OAuthProfile> {
  if (!config.appleClientId) {
    throw new Error('Apple sign-in is not configured');
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header) {
    throw new Error('Invalid Apple token');
  }

  const key = await appleSigningKey(decoded.header);
  const payload = jwt.verify(idToken, key, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: config.appleClientId,
  }) as jwt.JwtPayload;

  const subject = payload.sub as string;
  const email =
    typeof payload.email === 'string' ? payload.email.toLowerCase() : null;

  return {
    provider: 'apple',
    subject,
    email,
    displayName:
      nameFromClient?.trim() ||
      (typeof payload.email === 'string' ? payload.email.split('@')[0] : 'Apple user'),
  };
}
