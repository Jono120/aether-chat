import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config.js';
import { AuthError } from '../utils/authError.js';

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

const googleJwks = config.googleClientId
  ? jwksClient({
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      cache: true,
      rateLimit: true,
    })
  : null;

function signingKey(
  client: ReturnType<typeof jwksClient> | null,
  header: jwt.JwtHeader,
  provider: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!client || !header.kid) return reject(new Error(`${provider} JWKS unavailable`));
    client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error(`No ${provider} signing key`));
      resolve(key.getPublicKey());
    });
  });
}

function appleSigningKey(header: jwt.JwtHeader): Promise<string> {
  return signingKey(appleJwks, header, 'Apple');
}

/** Verifies the Google ID token locally against Google's JWKS (no tokeninfo round-trip). */
export async function verifyGoogleCredential(credential: string): Promise<OAuthProfile> {
  if (!config.googleClientId) {
    throw new AuthError('Google sign-in is not configured');
  }

  const decoded = jwt.decode(credential, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header) {
    throw new AuthError('Google sign-in could not be verified', 401);
  }

  let payload: jwt.JwtPayload;
  try {
    const key = await signingKey(googleJwks, decoded.header, 'Google');
    payload = jwt.verify(credential, key, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: config.googleClientId,
    }) as jwt.JwtPayload;
  } catch {
    throw new AuthError('Google sign-in could not be verified', 401);
  }

  const subject = typeof payload.sub === 'string' ? payload.sub : '';
  if (!subject) {
    throw new AuthError('Google sign-in could not be verified', 401);
  }

  if (payload.email_verified === false || payload.email_verified === 'false') {
    throw new AuthError('Google email is not verified', 401);
  }

  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';

  return {
    provider: 'google',
    subject,
    email,
    displayName: name || email?.split('@')[0] || 'Google user',
  };
}

export async function verifyAppleIdToken(
  idToken: string,
  nameFromClient?: string,
): Promise<OAuthProfile> {
  if (!config.appleClientId) {
    throw new AuthError('Apple sign-in is not configured');
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header) {
    throw new AuthError('Invalid Apple token', 401);
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
